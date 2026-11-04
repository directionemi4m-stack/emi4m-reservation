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

// --- Lien avec les listes d'appel et les inscriptions ---

// « Colin MOSSALGUE (trompette) » et « MOSSALGUE Colin » donnent la même clé : l'ordre des
// mots, les majuscules, les accents et les précisions entre parenthèses sont ignorés.
export function cleNomEleve(t: string): string {
  return motsDe(t.replace(/\([^)]*\)/g, " ")).sort().join(" ");
}

// Nom tel que les profs l'écrivent dans leurs listes : « Prénom NOM ».
export const nomAffiche = (e: { nom: string; prenom: string }) => [e.prenom, e.nom].filter(Boolean).join(" ");

// Distance d'édition (une lettre changée, ajoutée, retirée ou deux lettres inversées = 1).
function distance(a: string, b: string): number {
  if (a === b) return 0;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cout);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// Fautes tolérées selon la longueur : aucune sur un mot court, 1 jusqu'à 6 lettres, 2 au-delà.
const tolerance = (t: string) => (t.length <= 3 ? 0 : t.length <= 6 ? 1 : 2);
const proche = (a: string, b: string) => Math.abs(a.length - b.length) <= tolerance(a) && distance(a, b) <= tolerance(a);

// Chaque mot du nom de la liste retrouve un mot différent de l'annuaire (« Vanh Di San
// Bernardo » dans « Vanh DI SAN BERNARDO - SAPHENGTHONG »). Une initiale (« Colin M ») vaut
// pour un mot qui commence par elle.
function motsRetrouves(mots: string[], cible: string[], approche: boolean): boolean {
  const libres = [...cible];
  for (const m of mots) {
    const i = libres.findIndex((c) => c === m || (approche && (m.length === 1 ? c.startsWith(m) : proche(m, c))));
    if (i < 0) return false;
    libres.splice(i, 1);
  }
  return true;
}

// Les instruments d'un cours de groupe (« Ensemble Cordes ») pour départager deux prénoms.
const FAMILLES: Record<string, string[]> = {
  cordes: ["violon", "alto", "violoncelle", "contrebasse"],
  vents: ["flute", "clarinette", "saxophone", "trompette", "trombone", "hautbois", "basson", "cor", "tuba"],
};
const MOTS_VIDES = new Set(["ensemble", "cours", "atelier", "groupe", "collectif", "de", "du", "des", "la", "le", "les", "et"]);

// Combien de mots du nom du cours se retrouvent dans les instruments de l'élève.
function affinite(nomCours: string, instruments: string[]): number {
  const motsCours = motsDe(nomCours)
    .filter((m) => !MOTS_VIDES.has(m))
    .flatMap((m) => FAMILLES[m] ?? [m]);
  const motsInstr = instruments.flatMap(motsDe).filter((m) => m.length >= 3);
  return motsCours.filter((m) => motsInstr.some((i) => m.length >= 3 && (i.startsWith(m) || m.startsWith(i)))).length;
}

export interface Correspondant<T> {
  eleve: T;
  approche: boolean; // retrouvé malgré une écriture différente : on affiche le nom de l'annuaire
}

// Retrouve dans l'annuaire l'élève d'une liste d'appel, même écrit autrement : ordre des
// mots, prénom seul (s'il n'y a pas d'ambiguïté), petite faute de frappe, nom composé
// incomplet, mots collés. En cas de doute entre plusieurs élèves, l'instrument du cours
// départage ; sinon personne n'est proposé (mieux vaut rien qu'une mauvaise famille).
export function rapprocheurAnnuaire<T extends { nom: string; prenom: string; instruments?: string[] }>(eleves: T[]) {
  const fiches = eleves.map((eleve) => {
    const mots = motsDe(`${eleve.nom} ${eleve.prenom}`);
    return {
      eleve,
      cle: [...mots].sort().join(" "),
      mots,
      colles: [motsDe(`${eleve.prenom} ${eleve.nom}`).join(""), motsDe(`${eleve.nom} ${eleve.prenom}`).join("")],
    };
  });
  const parCle = new Map(fiches.map((f) => [f.cle, f.eleve]));

  return (nomListe: string, nomCours = ""): Correspondant<T> | null => {
    const cle = cleNomEleve(nomListe);
    if (!cle) return null;
    const exact = parCle.get(cle);
    if (exact) return { eleve: exact, approche: false };

    const mots = cle.split(" ");
    const colle = motsDe(nomListe.replace(/\([^)]*\)/g, " ")).join("");
    // D'abord les mots écrits pareil (« Leoni » = Leoni MAGNIN, pas Léonie THIERY), puis
    // avec une faute ou des mots collés (« UlysseZawadski »). Un prénom seul n'est jamais
    // cherché avec une faute.
    let trouves = fiches.filter((f) => motsRetrouves(mots, f.mots, false));
    if (trouves.length === 0) {
      trouves = fiches.filter(
        (f) =>
          (mots.length > 1 && motsRetrouves(mots, f.mots, true)) ||
          (colle.length >= 8 && f.colles.some((c) => proche(colle, c)))
      );
    }
    if (trouves.length === 0) return null;
    if (trouves.length > 1) {
      const scores = trouves.map((f) => affinite(nomCours, f.eleve.instruments ?? []));
      const max = Math.max(...scores);
      if (max === 0 || scores.filter((s) => s === max).length > 1) return null;
      trouves = [trouves[scores.indexOf(max)]];
    }
    return { eleve: trouves[0].eleve, approche: true };
  };
}
