// Liste fixe de durées (fichier Fiche_d_activité_accessoire.xlsx, demi-heure par
// demi-heure de 1h00 à 8h00) — contrairement aux types d'événement, pas besoin d'un
// écran admin pour gérer ça, la liste ne bouge pas.
export const DUREES_ACCESSOIRE = [
  "1h00", "1h30", "2h00", "2h30", "3h00", "3h30", "4h00",
  "4h30", "5h00", "5h30", "6h00", "6h30", "7h00", "7h30", "8h00",
] as const;
