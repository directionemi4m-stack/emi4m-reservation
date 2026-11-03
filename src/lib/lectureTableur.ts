import { inflateRawSync } from "node:zlib";

// Lit un fichier Excel (.xlsx) ou CSV et rend chaque feuille comme un tableau de lignes
// de texte. Écrit à la main (un .xlsx n'est qu'une archive zip de fichiers XML) pour ne
// pas dépendre d'une bibliothèque externe. Les anciens .xls (format binaire) et les .ods
// ne sont pas lus : il suffit de les réenregistrer en .xlsx.

export interface Feuille {
  nom: string;
  lignes: string[][];
}

export const TAILLE_MAX_TABLEUR = 10 * 1024 * 1024;
const DECOMPRESSE_MAX = 80 * 1024 * 1024; // garde-fou contre une archive piégée
const LIGNES_MAX = 10000;
const COLONNES_MAX = 200;

export class ErreurTableur extends Error {}

export function lireTableur(octets: Uint8Array, nomFichier: string): Feuille[] {
  const estZip = octets[0] === 0x50 && octets[1] === 0x4b;
  if (estZip) {
    const fichiers = lireZip(octets);
    if (fichiers.has("content.xml") && !fichiers.has("xl/workbook.xml")) {
      throw new ErreurTableur("Fichier LibreOffice (.ods) : enregistrez-le au format Excel (.xlsx), puis réessayez.");
    }
    return lireXlsx(fichiers);
  }
  if (octets[0] === 0xd0 && octets[1] === 0xcf) {
    throw new ErreurTableur("Ancien format Excel (.xls) : ouvrez-le et enregistrez-le au format .xlsx, puis réessayez.");
  }
  if (/\.(csv|txt)$/i.test(nomFichier)) return [{ nom: "CSV", lignes: lireCsv(decoderTexte(octets)) }];
  throw new ErreurTableur("Ce fichier n'est ni un fichier Excel (.xlsx) ni un CSV.");
}

// --- Archive zip ---

function lireZip(o: Uint8Array): Map<string, Uint8Array> {
  const vue = new DataView(o.buffer, o.byteOffset, o.byteLength);
  let fin = -1;
  for (let i = o.length - 22; i >= Math.max(0, o.length - 65557); i--) {
    if (vue.getUint32(i, true) === 0x06054b50) {
      fin = i;
      break;
    }
  }
  if (fin < 0) throw new ErreurTableur("Fichier Excel illisible (archive incomplète).");

  const nbEntrees = vue.getUint16(fin + 10, true);
  let p = vue.getUint32(fin + 16, true);
  const fichiers = new Map<string, Uint8Array>();
  let total = 0;
  for (let n = 0; n < nbEntrees; n++) {
    if (p + 46 > o.length || vue.getUint32(p, true) !== 0x02014b50) break;
    const methode = vue.getUint16(p + 10, true);
    const tailleCompressee = vue.getUint32(p + 20, true);
    const longueurNom = vue.getUint16(p + 28, true);
    const longueurExtra = vue.getUint16(p + 30, true);
    const longueurCommentaire = vue.getUint16(p + 32, true);
    const debutLocal = vue.getUint32(p + 42, true);
    const nom = new TextDecoder().decode(o.subarray(p + 46, p + 46 + longueurNom));
    p += 46 + longueurNom + longueurExtra + longueurCommentaire;

    // Seuls les fichiers XML utiles sont décompressés (pas les images, etc.).
    if (!/^(xl\/.*\.xml|xl\/_rels\/workbook\.xml\.rels|content\.xml)$/.test(nom)) continue;
    if (debutLocal + 30 > o.length || vue.getUint32(debutLocal, true) !== 0x04034b50) continue;
    const debutDonnees = debutLocal + 30 + vue.getUint16(debutLocal + 26, true) + vue.getUint16(debutLocal + 28, true);
    const brut = o.subarray(debutDonnees, debutDonnees + tailleCompressee);
    let contenu: Uint8Array;
    if (methode === 0) contenu = brut;
    else if (methode === 8) {
      try {
        contenu = inflateRawSync(brut, { maxOutputLength: DECOMPRESSE_MAX - total });
      } catch {
        throw new ErreurTableur("Fichier Excel illisible ou trop volumineux.");
      }
    } else continue;
    total += contenu.length;
    fichiers.set(nom, contenu);
  }
  return fichiers;
}

// --- Classeur Excel ---

function lireXlsx(fichiers: Map<string, Uint8Array>): Feuille[] {
  const texte = (nom: string) => {
    const f = fichiers.get(nom);
    return f ? new TextDecoder().decode(f) : null;
  };
  const classeur = texte("xl/workbook.xml");
  if (!classeur) throw new ErreurTableur("Fichier Excel illisible (classeur introuvable).");

  const liens = new Map<string, string>();
  for (const m of (texte("xl/_rels/workbook.xml.rels") ?? "").matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const id = attribut(m[1], "Id");
    const cible = attribut(m[1], "Target");
    if (id && cible) liens.set(id, cible.startsWith("/") ? cible.slice(1) : `xl/${cible}`);
  }

  const partages = lireTextesPartages(texte("xl/sharedStrings.xml") ?? "");
  const feuilles: Feuille[] = [];
  for (const m of classeur.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const nom = decoderEntites(attribut(m[1], "name") ?? "Feuille");
    const lien = attribut(m[1], "r:id") ?? attribut(m[1], "id");
    const xml = lien ? texte(liens.get(lien) ?? "") : null;
    if (xml !== null) feuilles.push({ nom, lignes: lireFeuille(xml, partages) });
  }
  if (feuilles.length === 0) throw new ErreurTableur("Aucune feuille lisible dans ce fichier Excel.");
  return feuilles;
}

function lireTextesPartages(xml: string): string[] {
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => texteRiche(m[1]));
}

// Le texte d'une cellule, éventuellement découpé en morceaux de mise en forme ; les
// indications de prononciation (rPh, pour le japonais) sont ignorées.
function texteRiche(xml: string): string {
  const sansPhonetique = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
  return [...sansPhonetique.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => decoderEntites(t[1])).join("");
}

function lireFeuille(xml: string, partages: string[]): string[][] {
  const lignes: string[][] = [];
  let numeroLigne = -1;
  for (const r of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const ref = attribut(r[1], "r");
    numeroLigne = ref ? Number(ref) - 1 : numeroLigne + 1;
    if (numeroLigne >= LIGNES_MAX) break;
    const cellules: string[] = [];
    let colonne = -1;
    for (const c of (r[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const refCellule = attribut(c[1], "r");
      colonne = refCellule ? indexColonne(refCellule) : colonne + 1;
      if (colonne >= COLONNES_MAX) continue;
      const valeur = valeurCellule(attribut(c[1], "t"), c[2] ?? "", partages);
      if (valeur !== "") cellules[colonne] = valeur;
    }
    if (cellules.length > 0) lignes[numeroLigne] = Array.from(cellules, (v) => v ?? "");
  }
  return Array.from(lignes, (l) => l ?? []);
}

function valeurCellule(type: string | null, contenu: string, partages: string[]): string {
  if (type === "inlineStr") return texteRiche(contenu).trim();
  const v = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(contenu)?.[1];
  if (v === undefined) return "";
  if (type === "s") return (partages[Number(v)] ?? "").trim();
  if (type === "b") return v === "1" ? "VRAI" : "FAUX";
  if (type === "str" || type === "e" || type === "d") return decoderEntites(v).trim();
  // Nombre : écrit tel quel, sans notation scientifique (un téléphone saisi comme
  // nombre, 612345678, reste lisible).
  const n = Number(v);
  if (!Number.isFinite(n)) return decoderEntites(v).trim();
  return Number.isInteger(n) ? BigInt(n).toString() : String(n);
}

function indexColonne(ref: string): number {
  const lettres = /^[A-Z]+/i.exec(ref)?.[0].toUpperCase() ?? "A";
  return [...lettres].reduce((s, l) => s * 26 + (l.charCodeAt(0) - 64), 0) - 1;
}

function attribut(attributs: string, nom: string): string | null {
  const echappe = nom.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\s)${echappe}\\s*=\\s*"([^"]*)"`).exec(attributs)?.[1] ?? null;
}

function decoderEntites(t: string): string {
  return t
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

// --- CSV ---

// Excel enregistre ses CSV en UTF-8 ou dans l'ancien codage Windows selon la version.
function decoderTexte(o: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(o).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(o);
  }
}

export function lireCsv(texte: string): string[][] {
  const premiere = texte.split(/\r?\n/, 1)[0] ?? "";
  const separateur = [";", ",", "\t"].reduce((a, b) => (premiere.split(b).length > premiere.split(a).length ? b : a));
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let champ = "";
  let guillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (guillemets) {
      if (c === '"' && texte[i + 1] === '"') {
        champ += '"';
        i++;
      } else if (c === '"') guillemets = false;
      else champ += c;
    } else if (c === '"' && champ === "") guillemets = true;
    else if (c === separateur) {
      ligne.push(champ.trim());
      champ = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texte[i + 1] === "\n") i++;
      ligne.push(champ.trim());
      lignes.push(ligne);
      if (lignes.length >= LIGNES_MAX) return lignes;
      ligne = [];
      champ = "";
    } else champ += c;
  }
  if (champ !== "" || ligne.length > 0) {
    ligne.push(champ.trim());
    lignes.push(ligne);
  }
  return lignes.map((l) => l.slice(0, COLONNES_MAX));
}
