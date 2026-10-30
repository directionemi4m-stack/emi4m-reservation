// Inventaire du matériel : logique pure (aucun accès base), testée dans inventaire.test.ts.

export const CATEGORIES_INVENTAIRE = [
  { valeur: "MUSIQUE", label: "Matériel de musique" },
  { valeur: "BUREAU", label: "Matériel de bureau" },
  { valeur: "LOGICIEL", label: "Logiciel" },
  { valeur: "AUTRE", label: "Autre" },
] as const;

export const ETATS_MATERIEL = [
  { valeur: "BON", label: "Bon état" },
  { valeur: "A_REVISER", label: "À réviser" },
  { valeur: "HORS_SERVICE", label: "Hors service" },
  { valeur: "SORTI", label: "Sorti de l'inventaire" },
] as const;

export function libelleCategorie(c: string): string {
  return CATEGORIES_INVENTAIRE.find((x) => x.valeur === c)?.label ?? c;
}

export function libelleEtat(e: string): string {
  return ETATS_MATERIEL.find((x) => x.valeur === e)?.label ?? e;
}

// 388745 → « 3 887,45 € »
export function formaterEuros(centimes: number): string {
  return `${(centimes / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/ | /g, " ")} €`;
}

// « 3 887,45 », « 3887.45 », « 1 020 € » → centimes ; null si vide ou illisible.
export function lireEuros(texte: string): number | null {
  const t = texte.replace(/[\s  €]/g, "").replace(",", ".");
  if (!t) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

// Nom du dossier Drive d'un bien : « N°12 — PIANO B.BERTHET » ; sans numéro, la désignation.
export function nomDossierArticle(article: { numeroImmo: number | null; designation: string }): string {
  const nom = article.numeroImmo !== null ? `N°${article.numeroImmo} — ${article.designation}` : article.designation;
  return nom.replace(/[\\/]/g, "-").slice(0, 120);
}
