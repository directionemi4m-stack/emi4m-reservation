// Liste partagée par tous les sélecteurs de jour de semaine (créneaux récurrents de
// salle, cours de présences) — un seul endroit à mettre à jour si l'ordre doit changer.
export const JOURS_SEMAINE_OPTIONS = [
  { valeur: "LUNDI", label: "Lundi" },
  { valeur: "MARDI", label: "Mardi" },
  { valeur: "MERCREDI", label: "Mercredi" },
  { valeur: "JEUDI", label: "Jeudi" },
  { valeur: "VENDREDI", label: "Vendredi" },
  { valeur: "SAMEDI", label: "Samedi" },
  { valeur: "DIMANCHE", label: "Dimanche" },
] as const;
