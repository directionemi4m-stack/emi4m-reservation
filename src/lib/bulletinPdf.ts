import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { decouperLignes, libelleMatiere, libellePeriode, MATIERES_CHAM } from "@/lib/bulletinsCham";
import { LOGO_EMI4M, LOGO_ISERE, LOGO_VERCORS } from "@/lib/bulletinLogos";

export interface PartieProf {
  matiere: string;
  precision: string | null;
  profId: string;
  profNom: string;
  texte: string;
  signature: Uint8Array;
  signeLe: Date;
}

export interface DonneesBulletin {
  eleve: { prenom: string; nom: string; classe?: string | null };
  anneeDebut: number;
  trimestre: number;
  parties: PartieProf[];
  direction: { signature: Uint8Array | null; nom: string };
}

const LARGEUR = 595.28; // A4
const HAUTEUR = 841.89;
const MARGE = 50;
const MARGE_BAS = 40; // le pied de page est plus bas, à 24
const LARGEUR_UTILE = LARGEUR - 2 * MARGE;

const ARDOISE = rgb(0.17, 0.24, 0.31);
const GRIS = rgb(0.45, 0.49, 0.53);
const GRIS_CLAIR = rgb(0.82, 0.85, 0.88);

// Le bulletin doit tenir sur une page : s'il déborde, on le redessine un peu plus serré
// (texte et espacements), jusqu'au dernier niveau ; au-delà, il passe sur deux pages.
const COMPACITES = [1, 0.92, 0.84, 0.76];

// Le bulletin compilé d'un élève pour un trimestre, à la manière du modèle papier : en-tête
// aux trois logos, une rubrique par matière avec l'appréciation de chaque prof, puis
// toutes les signatures (profs et direction) réunies en bas du document.
export async function genererBulletinPdf(donnees: DonneesBulletin): Promise<Uint8Array> {
  let pdf: PDFDocument | null = null;
  for (const k of COMPACITES) {
    pdf = await dessinerBulletin(donnees, k);
    if (pdf.getPageCount() === 1) break;
  }
  return pdf!.save();
}

async function dessinerBulletin(donnees: DonneesBulletin, k: number): Promise<PDFDocument> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Bulletin CHAM — ${donnees.eleve.prenom} ${donnees.eleve.nom} — ${libellePeriode(donnees.anneeDebut, donnees.trimestre)}`);
  pdf.setAuthor("EMI4M");

  const normale = await pdf.embedFont(StandardFonts.Helvetica);
  const grasse = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italique = await pdf.embedFont(StandardFonts.HelveticaOblique);

  let page = pdf.addPage([LARGEUR, HAUTEUR]);
  let y = HAUTEUR - MARGE;

  // Saut de page si la hauteur demandée ne tient plus.
  const place = (hauteur: number) => {
    if (y - hauteur < MARGE_BAS) {
      page = pdf.addPage([LARGEUR, HAUTEUR]);
      y = HAUTEUR - MARGE;
    }
  };

  const ecrire = (texte: string, opts: { x?: number; taille: number; police: PDFFont; couleur?: ReturnType<typeof rgb>; centre?: boolean }) => {
    const t = nettoyer(texte, opts.police);
    const largeur = opts.police.widthOfTextAtSize(t, opts.taille);
    const x = opts.centre ? (LARGEUR - largeur) / 2 : (opts.x ?? MARGE);
    page.drawText(t, { x, y, size: opts.taille, font: opts.police, color: opts.couleur ?? ARDOISE });
  };

  const paragraphe = (texte: string, taille: number, police: PDFFont, couleur = ARDOISE, retrait = 0) => {
    const interligne = taille * 1.35;
    const lignes = decouperLignes(nettoyer(texte, police), LARGEUR_UTILE - retrait, (t) => police.widthOfTextAtSize(t, taille));
    for (const ligne of lignes) {
      place(interligne);
      y -= interligne;
      if (ligne) page.drawText(ligne, { x: MARGE + retrait, y, size: taille, font: police, color: couleur });
    }
  };

  // --- En-tête ---
  const logos = await Promise.all([LOGO_EMI4M, LOGO_VERCORS, LOGO_ISERE].map((b64) => pdf.embedJpg(copieIndependante(Buffer.from(b64, "base64")))));
  const hauteurLogo = 52 * k;
  const [emi4m, vercors, isere] = logos.map((l) => ({ image: l, largeur: (l.width * hauteurLogo) / l.height }));
  page.drawImage(emi4m.image, { x: MARGE, y: y - hauteurLogo, width: emi4m.largeur, height: hauteurLogo });
  page.drawImage(vercors.image, { x: (LARGEUR - vercors.largeur) / 2, y: y - hauteurLogo, width: vercors.largeur, height: hauteurLogo });
  page.drawImage(isere.image, { x: LARGEUR - MARGE - isere.largeur, y: y - hauteurLogo, width: isere.largeur, height: hauteurLogo });
  y -= hauteurLogo + 34 * k;

  ecrire("BULLETIN CLASSE CHAM", { taille: 20 * Math.sqrt(k), police: grasse, centre: true });
  y -= 18 * k;
  ecrire(libellePeriode(donnees.anneeDebut, donnees.trimestre), { taille: 11, police: normale, couleur: GRIS, centre: true });
  y -= 30 * k;
  ecrire("Nom :", { taille: 12, police: grasse });
  ecrire(`${donnees.eleve.nom.toUpperCase()} ${donnees.eleve.prenom}`, { x: MARGE + 40, taille: 12, police: normale });
  if (donnees.eleve.classe) {
    // « Classe : 4e », calé à droite sur la ligne du nom.
    const valeur = nettoyer(donnees.eleve.classe, normale);
    const xValeur = LARGEUR - MARGE - normale.widthOfTextAtSize(valeur, 12);
    ecrire(valeur, { x: xValeur, taille: 12, police: normale });
    ecrire("Classe :", { x: xValeur - 6 - grasse.widthOfTextAtSize("Classe :", 12), taille: 12, police: grasse });
  }
  y -= 10;

  const titreRubrique = (titre: string) => {
    place(40 * k);
    y -= 26 * k;
    ecrire(titre, { taille: 13 * Math.sqrt(k), police: grasse, centre: true });
    y -= 6 * k;
    page.drawLine({ start: { x: MARGE, y }, end: { x: LARGEUR - MARGE, y }, thickness: 0.6, color: GRIS_CLAIR });
  };

  // --- Rubriques ---
  for (const { valeur } of MATIERES_CHAM) {
    titreRubrique(libelleMatiere(valeur));
    const parties = donnees.parties.filter((p) => p.matiere === valeur);
    if (parties.length === 0) {
      paragraphe("Non renseigné", 9 * k, italique, GRIS);
    }
    for (const p of parties) {
      paragraphe([p.precision, p.profNom].filter(Boolean).join(" — "), Math.max(7.5, 8.5 * k), italique, GRIS);
      paragraphe(p.texte, 10.5 * Math.sqrt(k), normale);
      y -= 4 * k;
    }
  }

  // --- Signatures ---
  // Une seule rangée pour toutes les signatures (jusqu'à cinq cadres), la direction en
  // dernier : la signature de la direction ne se retrouve plus seule sur une page.
  const embarquer = (png: Uint8Array) => pdf.embedPng(copieIndependante(png));

  // Un cadre par prof (sa signature la plus récente), même s'il intervient dans deux rubriques.
  const parProf = new Map<string, PartieProf[]>();
  // (Par nom aussi : le compte partagé de la direction peut avoir signé sous deux noms.)
  for (const p of donnees.parties) parProf.set(`${p.profId}|${p.profNom}`, [...(parProf.get(`${p.profId}|${p.profNom}`) ?? []), p]);
  const profs = [...parProf.values()].map((ps) => ps.sort((a, b) => b.signeLe.getTime() - a.signeLe.getTime()));

  const cadres = [
    ...profs.map((ps) => ({
      direction: false,
      image: ps[0].signature as Uint8Array | null,
      nom: ps[0].profNom,
      sousTitre: [...new Set(ps.map((p) => p.precision || libelleMatiere(p.matiere)))].join(", "),
    })),
    { direction: true, image: donnees.direction.signature, nom: donnees.direction.nom, sousTitre: "" },
  ];
  const colonnes = Math.min(5, Math.max(3, cadres.length));
  const ecart = 10;
  const l = (LARGEUR_UTILE - (colonnes - 1) * ecart) / colonnes;
  const h = Math.max(40, 52 * k);
  const tailleNom = 8;
  const tailleSous = 7;
  // Nom et matières sous le cadre, sur deux lignes au plus chacun.
  const lignesDe = (texte: string, police: PDFFont, taille: number) =>
    texte ? decouperLignes(nettoyer(texte, police), l, (t) => police.widthOfTextAtSize(t, taille)).slice(0, 2) : [];
  const etiquettes = cadres.map((c) => ({ nom: lignesDe(c.nom, grasse, tailleNom), sous: lignesDe(c.sousTitre, normale, tailleSous) }));
  const rangees: number[][] = [];
  for (let i = 0; i < cadres.length; i += colonnes) rangees.push(cadres.slice(i, i + colonnes).map((_, j) => i + j));
  const hauteurEtiquettes = (r: number[]) => Math.max(...r.map((i) => etiquettes[i].nom.length * 9.5 + etiquettes[i].sous.length * 8.5));
  const titre = 14; // « Les professeurs : », « La direction : »
  const hauteurRangee = (r: number[], n: number) => (n > 0 && r.includes(cadres.length - 1) ? titre : 0) + h + hauteurEtiquettes(r) + 8;

  // Tout le bloc reste ensemble.
  place(24 * k + titre + rangees.reduce((s, r, n) => s + hauteurRangee(r, n), 0));
  y -= 24 * k;
  const xColonne = (j: number) => MARGE + j * (l + ecart);
  const ecrireTitre = (texte: string, x: number) => page.drawText(texte, { x, y: y - 11, size: 11, font: grasse, color: ARDOISE });
  ecrireTitre(profs.length > 0 ? "Les professeurs :" : "Aucune signature de professeur pour l'instant", MARGE);
  if (rangees[0].includes(cadres.length - 1)) ecrireTitre("La direction :", xColonne(cadres.length - 1));
  y -= titre;

  for (const [n, rangee] of rangees.entries()) {
    if (n > 0 && rangee.includes(cadres.length - 1)) {
      ecrireTitre("La direction :", xColonne((cadres.length - 1) % colonnes));
      y -= titre;
    }
    for (const [j, i] of rangee.entries()) {
      const c = cadres[i];
      const x = xColonne(j);
      page.drawRectangle({ x, y: y - h, width: l, height: h, borderColor: GRIS_CLAIR, borderWidth: 0.6 });
      const image: PDFImage | null = c.image ? await embarquer(c.image) : null;
      if (image) {
        const echelle = Math.min((l - 10) / image.width, (h - 8) / image.height);
        const li = image.width * echelle;
        const hi = image.height * echelle;
        page.drawImage(image, { x: x + (l - li) / 2, y: y - h + (h - hi) / 2, width: li, height: hi });
      }
      let yl = y - h - 10;
      for (const ligne of etiquettes[i].nom) {
        page.drawText(ligne, { x, y: yl, size: tailleNom, font: grasse, color: ARDOISE });
        yl -= 9.5;
      }
      for (const ligne of etiquettes[i].sous) {
        page.drawText(ligne, { x, y: yl, size: tailleSous, font: normale, color: GRIS });
        yl -= 8.5;
      }
    }
    y -= h + hauteurEtiquettes(rangee) + 8;
  }

  // Pied de page discret sur chaque page.
  const genere = `Bulletin compilé le ${new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })} — École Musicale Itinérante des 4 Montagnes`;
  for (const p of pdf.getPages()) dessinerPied(p, nettoyer(genere, normale), normale);

  return pdf;
}

// pdf-lib lit les images depuis le début de leur zone mémoire (image.buffer), sans tenir
// compte de leur position dans cette zone. Or un Buffer Node ou un champ Bytes de Prisma
// peut n'être qu'une portion d'une zone plus grande : on lui passe donc toujours une copie
// qui commence au début de sa propre zone. (Sans cela : « SOI not found in JPEG ».)
export function copieIndependante(octets: Uint8Array): Uint8Array {
  return Uint8Array.from(octets);
}

function dessinerPied(page: PDFPage, texte: string, police: PDFFont) {
  const taille = 7;
  const largeur = police.widthOfTextAtSize(texte, taille);
  page.drawText(texte, { x: (LARGEUR - largeur) / 2, y: 24, size: taille, font: police, color: GRIS });
}

// Les polices standard du PDF ne savent pas tout écrire (émojis, certains symboles) :
// on remplace ce qui manque plutôt que de faire échouer la génération.
const caracteresParPolice = new WeakMap<PDFFont, Set<number>>();

export function nettoyer(texte: string, police: PDFFont): string {
  let jeu = caracteresParPolice.get(police);
  if (!jeu) {
    jeu = new Set(police.getCharacterSet());
    caracteresParPolice.set(police, jeu);
  }
  const remplacements: Record<string, string> = { " ": " ", " ": " ", " ": " ", "‑": "-", "\t": " " };
  let sortie = "";
  for (const c of texte) {
    if (c === "\n") {
      sortie += c;
      continue;
    }
    const r = remplacements[c] ?? c;
    sortie += jeu.has(r.codePointAt(0)!) ? r : "";
  }
  return sortie;
}
