// Boîte à idées : libellés et couleurs, partagés par les pages des profs et de la direction.

export const LIBELLE_TYPE_IDEE = { ECOLE: "Idée pour l'école", APPLI: "Amélioration de l'appli" } as const;
export type TypeIdee = keyof typeof LIBELLE_TYPE_IDEE;

export const LIBELLE_STATUT_IDEE = {
  NOUVELLE: "Nouvelle",
  A_L_ETUDE: "À l'étude",
  RETENUE: "Retenue",
  REALISEE: "Réalisée",
  NON_RETENUE: "Pas retenue",
} as const;
export type StatutIdee = keyof typeof LIBELLE_STATUT_IDEE;

export const COULEUR_STATUT_IDEE: Record<StatutIdee, string> = {
  NOUVELLE: "bg-sky-100 text-sky-800",
  A_L_ETUDE: "bg-status-attente/15 text-amber-800",
  RETENUE: "bg-violet-100 text-violet-800",
  REALISEE: "bg-status-dispo/15 text-emerald-800",
  NON_RETENUE: "bg-slate-100 text-slate-600",
};

export const TITRE_MAX = 120;
export const TEXTE_MAX = 3000;
export const REPONSE_MAX = 2000;
