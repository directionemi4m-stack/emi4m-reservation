// Bilan de l'année (AG, conseil d'administration, communauté de communes, subventions) :
// mise en forme pure des chiffres calculés par bilanServeur.ts, et export en tableur.

export interface Ligne {
  libelle: string;
  nombre: number;
}

export interface SectionBilan {
  titre: string;
  chiffres: Ligne[]; // chiffres clés de la section
  tableaux: { titre: string; colonne: string; lignes: Ligne[] }[]; // répartitions
  note?: string;
}

// Compte les valeurs et les trie de la plus fréquente à la moins fréquente (puis A→Z).
export function repartition(valeurs: string[]): Ligne[] {
  const comptes = new Map<string, number>();
  for (const v of valeurs) comptes.set(v, (comptes.get(v) ?? 0) + 1);
  return [...comptes]
    .map(([libelle, nombre]) => ({ libelle, nombre }))
    .sort((a, b) => b.nombre - a.nombre || a.libelle.localeCompare(b.libelle, "fr"));
}

// Les communes écrites librement par les familles (« St Nizier », « Villard de Lanss »,
// « Autrans Meaudre en Vercor ») ramenées à la commune officielle. Autrans et Méaudre
// forment une seule commune depuis 2016.
const COMMUNES: { officielle: string; mots: string[][]; ccmv: boolean }[] = [
  { officielle: "Villard-de-Lans", mots: [["villard"]], ccmv: true },
  { officielle: "Lans-en-Vercors", mots: [["lans"]], ccmv: true },
  { officielle: "Autrans-Méaudre en Vercors", mots: [["autrans"], ["meaudre"]], ccmv: true },
  { officielle: "Corrençon-en-Vercors", mots: [["correncon"]], ccmv: true },
  { officielle: "Saint-Nizier-du-Moucherotte", mots: [["nizier"]], ccmv: true },
  { officielle: "Engins", mots: [["engins"]], ccmv: true },
  { officielle: "La Chapelle-en-Vercors", mots: [["chapelle", "vercors"]], ccmv: false },
  { officielle: "Saint-Martin-en-Vercors", mots: [["martin", "vercors"]], ccmv: false },
];

const motsCommune = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);

// Une lettre d'écart tolérée (deux au-delà de 6 lettres) : « marttin », « lanss ».
function presque(a: string, b: string) {
  if (a === b) return true;
  const tol = b.length > 6 ? 2 : b.length > 3 ? 1 : 0;
  if (tol === 0 || Math.abs(a.length - b.length) > tol) return false;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length] <= tol;
}

export function communeOfficielle(texte: string | null | undefined): { nom: string; ccmv: boolean | null } {
  if (!texte?.trim()) return { nom: "Non renseignée", ccmv: null };
  const mots = motsCommune(texte);
  const c = COMMUNES.find((x) => x.mots.some((groupe) => groupe.every((g) => mots.some((m) => presque(m, g)))));
  return c ? { nom: c.officielle, ccmv: c.ccmv } : { nom: texte.trim(), ccmv: false };
}

export const pourcentage = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 1000) / 10 : 0);
export const formaterPourcentage = (p: number) => `${p.toLocaleString("fr-FR")} %`;

// Le bilan en CSV pour Excel (séparateur « ; », BOM pour les accents) : une section après
// l'autre, chaque répartition avec sa part en %.
export function bilanEnCsv(titre: string, sections: SectionBilan[]): string {
  const cellule = (v: string | number) => {
    const t = String(v);
    return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const lignes: (string | number)[][] = [[titre], []];
  for (const s of sections) {
    lignes.push([s.titre.toUpperCase()]);
    for (const c of s.chiffres) lignes.push([c.libelle, c.nombre]);
    for (const t of s.tableaux) {
      const total = t.lignes.reduce((n, l) => n + l.nombre, 0);
      lignes.push([], [t.titre], [t.colonne, "Nombre", "Part"]);
      for (const l of t.lignes) lignes.push([l.libelle, l.nombre, formaterPourcentage(pourcentage(l.nombre, total))]);
    }
    if (s.note) lignes.push([s.note]);
    lignes.push([]);
  }
  return `﻿${lignes.map((l) => l.map(cellule).join(";")).join("\r\n")}\r\n`;
}
