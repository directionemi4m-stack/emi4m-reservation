import type { JourSemaine } from "@/generated/prisma/client";

// Dupliqué volontairement depuis lib/planning.ts (identique) : ce fichier ne doit
// dépendre d'aucun module qui importe lib/db.ts, pour rester pur et testable sans base
// de données (cf. lib/presences.test.ts).
function ajouterJours(date: Date, n: number): Date {
  const resultat = new Date(date);
  resultat.setUTCDate(resultat.getUTCDate() + n);
  return resultat;
}

export const NB_SEANCES = 30;
export const SEUIL_ALERTE_ABSENCES = 3;

export interface PeriodeVacances {
  debut: Date;
  fin: Date;
}

function estEnVacances(date: Date, vacances: PeriodeVacances[]): boolean {
  const t = date.getTime();
  return vacances.some(({ debut, fin }) => t >= debut.getTime() && t < fin.getTime());
}

// Trouve la séance la plus proche d'aujourd'hui (à venir en priorité, sinon la plus proche passée).
export function seanceLaPlusProche<T extends { id: string; date: Date }>(
  seances: T[]
): string | null {
  if (!seances.length) return null;
  const maintenant = Date.now();
  let meilleur = seances[0];
  let meilleurEcart = Infinity;
  let premiereFuture: string | null = null;
  for (const s of seances) {
    const t = s.date.getTime();
    if (t >= maintenant - 12 * 60 * 60 * 1000 && premiereFuture === null) premiereFuture = s.id;
    const ecart = Math.abs(t - maintenant);
    if (ecart < meilleurEcart) {
      meilleurEcart = ecart;
      meilleur = s;
    }
  }
  return premiereFuture ?? meilleur.id;
}

const INDEX_JOUR_SEMAINE: Record<JourSemaine, number> = {
  LUNDI: 0,
  MARDI: 1,
  MERCREDI: 2,
  JEUDI: 3,
  VENDREDI: 4,
  SAMEDI: 5,
  DIMANCHE: 6,
};

// Première date >= apartirDe qui tombe sur le jour de la semaine demandé — pour ne
// jamais dépendre d'une date de départ qu'on suppose (à tort) être déjà ce jour-là
// (cause du bug des cours générés sur le mauvais jour, sept. 2026).
export function premiereOccurrence(jourSemaine: JourSemaine, apartirDe: Date): Date {
  const cible = INDEX_JOUR_SEMAINE[jourSemaine];
  const actuel = (apartirDe.getUTCDay() + 6) % 7; // lundi = 0 ... dimanche = 6
  const decalage = (cible - actuel + 7) % 7;
  return ajouterJours(apartirDe, decalage);
}

// Génère N dates hebdomadaires à partir de dateDebut (incluse, déjà sur le bon jour de
// la semaine), en sautant les périodes de vacances fournies.
export function genererDatesSeances(
  dateDebut: Date,
  vacances: PeriodeVacances[],
  nb: number = NB_SEANCES
): Date[] {
  const dates: Date[] = [];
  let courante = new Date(dateDebut);
  let garde = 0;
  while (dates.length < nb && garde < 500) {
    if (!estEnVacances(courante, vacances)) dates.push(new Date(courante));
    courante = ajouterJours(courante, 7);
    garde++;
  }
  return dates;
}
