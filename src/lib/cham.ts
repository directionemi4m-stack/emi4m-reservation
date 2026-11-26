import type { AutorisationIntercours, AutorisationSortie } from "@/generated/prisma/client";

// Sortie entre deux cours.
export const AUTORISATIONS_INTERCOURS: AutorisationIntercours[] = ["A_RENSEIGNER", "AUTORISE", "NON_AUTORISE"];

export const LIBELLE_INTERCOURS: Record<AutorisationIntercours, string> = {
  A_RENSEIGNER: "À renseigner",
  AUTORISE: "Autorisé(e)",
  NON_AUTORISE: "Non autorisé(e)",
};

export const STYLE_INTERCOURS: Record<AutorisationIntercours, string> = {
  AUTORISE: "bg-status-dispo/15 text-status-dispo",
  NON_AUTORISE: "bg-status-occupee/15 text-status-occupee",
  A_RENSEIGNER: "bg-slate-200 text-slate-500",
};

// Sortie de fin de journée, à 16h30.
export const AUTORISATIONS: AutorisationSortie[] = ["A_RENSEIGNER", "SEUL", "ACCOMPAGNE"];

export const LIBELLE_AUTORISATION: Record<AutorisationSortie, string> = {
  A_RENSEIGNER: "À renseigner",
  SEUL: "Peut partir seul(e)",
  ACCOMPAGNE: "Doit être récupéré(e) par un adulte",
};

// Couleurs reprises de la charte de l'appli : vert = feu vert, orange = un adulte doit venir,
// gris = information manquante (donc rien n'est présumé autorisé).
export const STYLE_AUTORISATION: Record<AutorisationSortie, string> = {
  SEUL: "bg-status-dispo/15 text-status-dispo",
  ACCOMPAGNE: "bg-status-attente/15 text-status-attente",
  A_RENSEIGNER: "bg-slate-200 text-slate-500",
};

// Classes du collège, dans l'ordre : l'élève avance d'une classe à chaque rentrée.
export const CLASSES_CHAM = ["6e", "5e", "4e", "3e"] as const;
export type ClasseCham = (typeof CLASSES_CHAM)[number];

// La classe de l'élève pour une année scolaire (2026 pour 2026-2027), d'après l'année où
// il était en 6e. null si on ne la connaît pas ou s'il n'est pas au collège cette année-là.
export function classeEnAnnee(anneeSixieme: number | null | undefined, anneeDebut: number): ClasseCham | null {
  if (anneeSixieme == null) return null;
  return CLASSES_CHAM[anneeDebut - anneeSixieme] ?? null;
}

interface ClasseEleve {
  anneeSixieme: number | null;
  division: string | null;
  anneeDivision: number | null;
}

// La division (« 5B ») si on la connaît pour cette année scolaire.
export function divisionEnAnnee(e: ClasseEleve, anneeDebut: number): string | null {
  return e.division && e.anneeDivision === anneeDebut ? e.division : null;
}

// Ce qu'on écrit sur le bulletin : la division (« 5B »), sinon le niveau (« 5e »).
export function libelleClasse(e: ClasseEleve, anneeDebut: number): string | null {
  return divisionEnAnnee(e, anneeDebut) ?? classeEnAnnee(e.anneeSixieme, anneeDebut);
}

// Saisie libre « 5 b », « 5ème B » → « 5B ». null si vide ou illisible.
export function normaliserDivision(brut: string): string | null {
  const m = /^\s*([3-6])\s*(?:e|è|ème|eme)?\s*([A-Za-z])\s*$/i.exec(brut);
  return m ? `${m[1]}${m[2].toUpperCase()}` : null;
}

// L'inverse : « en 4e en 2026-2027 » → en 6e en 2024-2025.
export function anneeSixiemePour(classe: string, anneeDebut: number): number | null {
  const rang = CLASSES_CHAM.indexOf(classe as ClasseCham);
  return rang < 0 ? null : anneeDebut - rang;
}

// « +33612345678 » → « 06 12 34 56 78 » (les autres formats sont laissés tels quels).
export function formaterTelephone(brut: string) {
  const chiffres = brut.replace(/[^\d+]/g, "");
  const national = chiffres.startsWith("+33") ? `0${chiffres.slice(3)}` : chiffres;
  return /^0\d{9}$/.test(national) ? national.replace(/(\d{2})(?=\d)/g, "$1 ") : brut;
}

export function lienTelephone(brut: string) {
  return `tel:${brut.replace(/[^\d+]/g, "")}`;
}

export function sansAccents(texte: string) {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
