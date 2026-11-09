// Appels oubliés : une séance passée sans feuille d'appel ni absence du prof déclarée.
// Module pur (sans base de données), testé dans appels.test.ts.

// La plupart des profs font l'appel dans les 2 jours : une séance n'est « en retard » qu'à partir du 3e.
export const JOURS_AVANT_RAPPEL = 3;
// Au-delà, une séance oubliée n'est plus réclamée (début de l'appli, cours non tenu…).
export const JOURS_FENETRE = 21;

const JOUR = 86400000;

export interface SeanceAppel {
  date: Date; // jour de la séance, à minuit UTC
  aUnAppel: boolean; // feuille d'appel enregistrée ou absence du prof déclarée
}

// La séance est passée et attend toujours son appel (dans la fenêtre des 3 semaines).
export function appelAFaire(s: SeanceAppel, aujourdHui: Date): boolean {
  const age = Math.round((aujourdHui.getTime() - s.date.getTime()) / JOUR);
  return !s.aUnAppel && age >= 1 && age <= JOURS_FENETRE;
}

// Appel à faire depuis au moins 3 jours : compté « en retard » (pastille, vue de la direction).
export function appelEnRetard(s: SeanceAppel, aujourdHui: Date): boolean {
  const age = Math.round((aujourdHui.getTime() - s.date.getTime()) / JOUR);
  return appelAFaire(s, aujourdHui) && age >= JOURS_AVANT_RAPPEL;
}

// Bornes de dates pour la requête : séances d'il y a 1 à 21 jours.
export function bornesAppels(aujourdHui: Date) {
  return {
    gte: new Date(aujourdHui.getTime() - JOURS_FENETRE * JOUR),
    lt: aujourdHui,
  };
}
