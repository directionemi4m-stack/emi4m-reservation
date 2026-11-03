// Message type des demandes de salle aux mairies. Les variables entre accolades sont
// remplacées par la salle, la commune, la date et l'horaire de la demande. Module pur.

export interface ModeleMairie {
  sujet: string;
  corps: string;
}

export const VARIABLES_MAIRIE = [
  { cle: "salle", libelle: "nom de la salle" },
  { cle: "commune", libelle: "commune" },
  { cle: "date", libelle: "date (ex. samedi 19 décembre)" },
  { cle: "debut", libelle: "heure de début" },
  { cle: "fin", libelle: "heure de fin" },
] as const;

export type ValeursMairie = Record<(typeof VARIABLES_MAIRIE)[number]["cle"], string>;

export const MODELE_MAIRIE_DEFAUT: ModeleMairie = {
  sujet: "Demande de réservation de salle — {salle} ({commune}) — {date}",
  corps:
    "Bonjour,\n\nJe me permets de vous solliciter afin de réserver la salle {salle} ({commune}) pour l'École Musicale Itinérante des 4 Montagnes (EMI4M), à la date et l'horaire suivants :\n\n{date}, de {debut} à {fin}\n\nMerci de bien vouloir me confirmer la disponibilité de cette salle.\n\nCordialement,\nLa direction — EMI4M",
};

export const SUJET_MAX = 200;
export const CORPS_MAX = 5000;

// Remplace {salle}, {date}… ; une accolade inconnue est laissée telle quelle.
export function remplirModele(texte: string, valeurs: ValeursMairie): string {
  return texte.replace(/\{(\w+)\}/g, (tout, cle: string) => (cle in valeurs ? valeurs[cle as keyof ValeursMairie] : tout));
}
