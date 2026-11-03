// Annuaire des élèves : à partir des lignes du fichier Excel des inscriptions, retrouve
// les colonnes utiles (nom, prénom, instrument, mail, téléphone, commune), nettoie les
// valeurs et regroupe les doublons. Module pur, utilisé à la fois par l'aperçu (navigateur)
// et par l'import (serveur), pour que l'aperçu montre exactement ce qui sera enregistré.

export type CleChamp = "nom" | "prenom" | "nomComplet" | "instrument" | "email" | "telephone" | "commune";

export const CHAMPS: { cle: CleChamp; libelle: string }[] = [
  { cle: "nom", libelle: "Nom" },
  { cle: "prenom", libelle: "Prénom" },
  { cle: "nomComplet", libelle: "Nom et prénom (même colonne)" },
  { cle: "instrument", libelle: "Instrument" },
  { cle: "email", libelle: "Mail" },
  { cle: "telephone", libelle: "Téléphone" },
  { cle: "commune", libelle: "Commune" },
];

export const estCleChamp = (v: unknown): v is CleChamp => CHAMPS.some((c) => c.cle === v);

// La correspondance choisie : pour chaque colonne du fichier, l'information qu'elle
// contient (ou null : colonne ignorée). Plusieurs colonnes peuvent porter la même
// information (mail de la mère, mail du père…) : leurs valeurs s'additionnent.
export type Correspondance = (CleChamp | null)[];

export interface EleveExtrait {
  nom: string;
  prenom: string;
  instruments: string[];
  emails: string[];
  telephones: string[];
  commune: string | null;
}

// Minuscules, sans accents ni ponctuation : « Villard-de-Lans » = « VILLARD DE LANS ».
export function normaliser(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9@.]+/g, " ")
    .trim();
}

const motsDe = (t: string) => normaliser(t).replace(/[@.]/g, " ").split(/\s+/).filter(Boolean);

// Devine l'information d'une colonne d'après son titre. Les colonnes des responsables
// (« Nom du responsable ») ne sont pas prises pour le nom de l'élève.
export function devinerChamp(enTete: string): CleChamp | null {
  const mots = motsDe(enTete);
  const a = (...m: string[]) => m.some((x) => mots.includes(x));
  if (mots.length === 0) return null;
  if (a("mail", "email", "courriel", "mel") || (a("e") && a("mail"))) return "email";
  if (a("tel", "telephone", "telephones", "portable", "mobile", "gsm")) return "telephone";
  if (a("instrument", "instruments", "discipline", "disciplines")) return "instrument";
  if (a("commune", "ville", "localite", "residence")) return "commune";
  if (a("responsable", "parent", "parents", "pere", "mere", "representant", "tuteur", "payeur", "contact")) return null;
  if (a("prenom", "prenoms") && a("nom")) return "nomComplet";
  if (a("prenom", "prenoms")) return "prenom";
  if (a("nom")) return "nom";
  if (mots.join(" ") === "eleve" || mots.join(" ") === "eleves") return "nomComplet";
  return null;
}

// La ligne des titres de colonnes : celle, parmi les premières, où l'on reconnaît le plus
// de titres (un fichier commence parfois par un titre ou une ligne vide).
export function trouverLigneEnTetes(lignes: string[][]): number {
  let meilleure = -1;
  let score = 0;
  for (let i = 0; i < Math.min(lignes.length, 20); i++) {
    const s = new Set((lignes[i] ?? []).map(devinerChamp).filter(Boolean)).size;
    if (s > score) {
      score = s;
      meilleure = i;
    }
  }
  if (meilleure >= 0) return meilleure;
  const premiere = lignes.findIndex((l) => l.filter((v) => v.trim()).length >= 2);
  return Math.max(0, premiere);
}

// Correspondance proposée : celle de l'import précédent pour les titres déjà vus (clé :
// titre normalisé), sinon la devinette.
export function correspondanceProposee(enTetes: string[], precedente: Record<string, string> = {}): Correspondance {
  return enTetes.map((t) => {
    const cle = normaliser(t);
    if (cle && cle in precedente) {
      const v = precedente[cle];
      return estCleChamp(v) ? v : null;
    }
    return devinerChamp(t);
  });
}

export function correspondanceAMemoriser(enTetes: string[], correspondance: Correspondance): Record<string, string> {
  const memo: Record<string, string> = {};
  enTetes.forEach((t, i) => {
    const cle = normaliser(t);
    if (cle) memo[cle] = correspondance[i] ?? "ignorer";
  });
  return memo;
}

// --- Nettoyage des valeurs ---

const separer = (v: string, motif: RegExp) =>
  v
    .split(motif)
    .map((x) => x.trim())
    .filter(Boolean);

export function extraireEmails(v: string): string[] {
  return (v.match(/[^\s,;<>()"'/]+@[^\s,;<>()"'/]+\.[a-z]{2,}/gi) ?? []).map((e) => e.toLowerCase());
}

// « 612345678 » (le 0 perdu par Excel), « 06.12.34.56.78 », « +33 6 12 34 56 78 » →
// « 06 12 34 56 78 ». Les numéros étrangers sont laissés tels quels.
export function formaterTelephone(v: string): string | null {
  const brut = v.trim();
  if (!brut) return null;
  let chiffres = brut.replace(/\D/g, "");
  if (brut.startsWith("+33") || (chiffres.startsWith("33") && chiffres.length === 11)) chiffres = `0${chiffres.slice(2)}`;
  else if (brut.startsWith("0033")) chiffres = `0${chiffres.slice(4)}`;
  if (chiffres.length === 9 && /^[1-9]/.test(chiffres)) chiffres = `0${chiffres}`;
  if (chiffres.length === 10 && chiffres.startsWith("0")) return chiffres.replace(/(\d\d)(?=\d)/g, "$1 ");
  return chiffres.length >= 6 ? brut : null;
}

export function extraireTelephones(v: string): string[] {
  // Plusieurs numéros dans une même case : séparés par / , ; « ou » ou un retour à la ligne.
  return separer(v, /[\n,;/]|\bou\b/i)
    .flatMap((t) => {
      // Deux numéros collés dans la même case, séparés par une simple espace.
      const chiffres = t.replace(/\D/g, "");
      return chiffres.length === 20 && /^0\d{9}0/.test(chiffres) ? [chiffres.slice(0, 10), chiffres.slice(10)] : [t];
    })
    .map(formaterTelephone)
    .filter((t): t is string => !!t);
}

export function extraireInstruments(v: string): string[] {
  return separer(v, /[\n,;/+]/).map(miseEnForme);
}

// « MARIE » ou « anne-sophie » → « Marie », « Anne-Sophie » ; « McKenzie » est gardé.
function miseEnFormePrenom(v: string): string {
  const t = v.trim().replace(/\s+/g, " ");
  if (t !== t.toUpperCase() && t !== t.toLowerCase()) return t;
  return t.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, l: string) => sep + l.toUpperCase());
}

const PETITS_MOTS =new Set(["de", "du", "des", "la", "le", "les", "en", "sur", "sous", "et", "d", "l", "a", "aux"]);

// « TROMPETTE » → « Trompette » ; une saisie déjà en minuscules/majuscules mêlées est gardée.
function miseEnForme(v: string): string {
  const t = v.trim().replace(/\s+/g, " ");
  const base = t === t.toUpperCase() || t === t.toLowerCase() ? t.toLowerCase() : t;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

// « VILLARD DE LANS » → « Villard-de-Lans » si la commune est connue de l'appli ; sinon
// une mise en forme simple (« LANS EN VERCORS » → « Lans en Vercors »).
export function miseEnFormeCommune(v: string, connues: string[]): string | null {
  const t = v.trim().replace(/\s+/g, " ");
  if (!t) return null;
  const cle = cleCommune(t);
  const connue = connues.find((c) => cleCommune(c) === cle);
  if (connue) return connue;
  if (t !== t.toUpperCase() && t !== t.toLowerCase()) return t;
  return t
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((m, i) => (i > 0 && PETITS_MOTS.has(m) ? m : m.charAt(0).toUpperCase() + m.slice(1)))
    .join("");
}

const cleCommune = (t: string) =>
  normaliser(t)
    .replace(/\bste\b/g, "sainte")
    .replace(/\bst\b/g, "saint")
    .replace(/\b\d{5}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

// --- Extraction ---

export interface ResultatExtraction {
  eleves: EleveExtrait[];
  lignesIgnorees: number; // lignes sans nom
  doublonsFusionnes: number; // même élève sur plusieurs lignes (un instrument par ligne…)
}

const uniques = (l: string[]) => {
  const vus = new Set<string>();
  return l.filter((v) => {
    const k = normaliser(v) || v;
    if (vus.has(k)) return false;
    vus.add(k);
    return true;
  });
};

export function extraireEleves(
  lignes: string[][],
  ligneEnTetes: number,
  correspondance: Correspondance,
  communesConnues: string[] = []
): ResultatExtraction {
  const parCle = new Map<string, EleveExtrait>();
  let lignesIgnorees = 0;
  let doublonsFusionnes = 0;

  for (const ligne of lignes.slice(ligneEnTetes + 1)) {
    if (!ligne.some((v) => v.trim())) continue;
    const valeurs = (cle: CleChamp) =>
      correspondance.flatMap((c, i) => (c === cle && ligne[i]?.trim() ? [ligne[i].trim()] : []));

    let nom = valeurs("nom").join(" ");
    let prenom = valeurs("prenom").join(" ");
    if (!nom && !prenom) {
      // « DUPONT Marie » : le nom est la partie en majuscules, sinon le premier mot.
      const complet = valeurs("nomComplet").join(" ").replace(/\s+/g, " ");
      const mots = complet.split(" ").filter(Boolean);
      const enMajuscules = mots.filter((m) => /\p{Lu}/u.test(m) && m === m.toUpperCase());
      if (enMajuscules.length > 0 && enMajuscules.length < mots.length) {
        nom = enMajuscules.join(" ");
        prenom = mots.filter((m) => !enMajuscules.includes(m)).join(" ");
      } else {
        nom = mots[0] ?? "";
        prenom = mots.slice(1).join(" ");
      }
    }
    if (!nom && !prenom) {
      lignesIgnorees++;
      continue;
    }

    const eleve: EleveExtrait = {
      nom: nom.replace(/\s+/g, " ").toLocaleUpperCase("fr"),
      prenom: miseEnFormePrenom(prenom),
      instruments: valeurs("instrument").flatMap(extraireInstruments),
      emails: valeurs("email").flatMap(extraireEmails),
      telephones: valeurs("telephone").flatMap(extraireTelephones),
      commune: valeurs("commune").map((c) => miseEnFormeCommune(c, communesConnues)).find(Boolean) ?? null,
    };

    const cle = `${normaliser(eleve.nom)}|${normaliser(eleve.prenom)}`;
    const existant = parCle.get(cle);
    if (existant) {
      doublonsFusionnes++;
      existant.instruments.push(...eleve.instruments);
      existant.emails.push(...eleve.emails);
      existant.telephones.push(...eleve.telephones);
      existant.commune ??= eleve.commune;
    } else parCle.set(cle, eleve);
  }

  const eleves = [...parCle.values()].map((e) => ({
    ...e,
    instruments: uniques(e.instruments),
    emails: uniques(e.emails),
    telephones: uniques(e.telephones),
  }));
  harmoniserCommunes(eleves);
  harmoniserInstruments(eleves);
  eleves.sort((a, b) => comparerEleves(a, b));
  return { eleves, lignesIgnorees, doublonsFusionnes };
}

export function comparerEleves(a: { nom: string; prenom: string }, b: { nom: string; prenom: string }) {
  return a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }) || a.prenom.localeCompare(b.prenom, "fr", { sensitivity: "base" });
}

// Une même commune écrite de deux façons (« Lans-en-Vercors », « Lans en Vercors ») prend
// partout l'écriture la plus fréquente, pour qu'elle n'apparaisse qu'une fois dans le filtre.
function harmoniserCommunes(eleves: EleveExtrait[]) {
  const ecriture = plusFrequentes(eleves.flatMap((e) => (e.commune ? [e.commune] : [])), cleCommune);
  for (const e of eleves) if (e.commune) e.commune = ecriture.get(cleCommune(e.commune)) ?? e.commune;
}

function harmoniserInstruments(eleves: EleveExtrait[]) {
  const ecriture = plusFrequentes(eleves.flatMap((e) => e.instruments), normaliser);
  for (const e of eleves) e.instruments = uniques(e.instruments.map((i) => ecriture.get(normaliser(i)) ?? i));
}

function plusFrequentes(valeurs: string[], cle: (v: string) => string): Map<string, string> {
  const comptes = new Map<string, Map<string, number>>();
  for (const v of valeurs) {
    const k = cle(v);
    const c = comptes.get(k) ?? new Map<string, number>();
    c.set(v, (c.get(v) ?? 0) + 1);
    comptes.set(k, c);
  }
  return new Map([...comptes].map(([k, c]) => [k, [...c].sort((a, b) => b[1] - a[1])[0][0]]));
}

// --- Recherche (page de l'annuaire) ---

export interface FiltresAnnuaire {
  texte: string;
  instrument: string; // "" = tous
  commune: string; // "" = toutes
}

export function filtrerEleves<T extends EleveExtrait>(eleves: T[], f: FiltresAnnuaire): T[] {
  const mots = normaliser(f.texte).split(/\s+/).filter(Boolean);
  return eleves.filter((e) => {
    if (f.instrument && !e.instruments.includes(f.instrument)) return false;
    if (f.commune && e.commune !== f.commune) return false;
    if (mots.length === 0) return true;
    const cible = normaliser([e.nom, e.prenom, ...e.instruments, e.commune ?? "", ...e.emails].join(" "));
    const chiffres = e.telephones.join(" ").replace(/\D/g, "");
    return mots.every((m) => cible.includes(m) || (/^\d{2,}$/.test(m) && chiffres.includes(m)));
  });
}

// Les valeurs proposées dans un filtre, avec le nombre d'élèves, par ordre alphabétique.
export function valeursFiltre(eleves: EleveExtrait[], champ: "instruments" | "commune"): { valeur: string; nombre: number }[] {
  const comptes = new Map<string, number>();
  for (const e of eleves) {
    const v = champ === "commune" ? (e.commune ? [e.commune] : []) : e.instruments;
    for (const x of v) comptes.set(x, (comptes.get(x) ?? 0) + 1);
  }
  return [...comptes]
    .map(([valeur, nombre]) => ({ valeur, nombre }))
    .sort((a, b) => a.valeur.localeCompare(b.valeur, "fr", { sensitivity: "base" }));
}
