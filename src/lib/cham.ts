import type { AutorisationSortie } from "@/generated/prisma/client";

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
