// Vacances scolaires Zone A (académie de Grenoble) 2026-2027 — [début, fin[ (reprise exclue).
// À mettre à jour chaque année.
const VACANCES: Array<[string, string]> = [
  ["2026-10-17", "2026-11-02"], // Toussaint
  ["2026-12-19", "2027-01-04"], // Noël
  ["2027-02-06", "2027-02-22"], // Hiver
  ["2027-04-10", "2027-04-26"], // Printemps
  ["2027-05-05", "2027-05-10"], // Pont Ascension
];

export const NB_SEANCES = 30;
export const SEUIL_ALERTE_ABSENCES = 3;

function estEnVacances(date: Date): boolean {
  const t = date.getTime();
  return VACANCES.some(([debut, fin]) => {
    const t0 = new Date(`${debut}T00:00:00.000Z`).getTime();
    const t1 = new Date(`${fin}T00:00:00.000Z`).getTime();
    return t >= t0 && t < t1;
  });
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

// Génère N dates hebdomadaires à partir de dateDebut (incluse), en sautant les vacances.
export function genererDatesSeances(dateDebut: Date, nb: number = NB_SEANCES): Date[] {
  const dates: Date[] = [];
  let courante = new Date(dateDebut);
  let garde = 0;
  while (dates.length < nb && garde < 500) {
    if (!estEnVacances(courante)) dates.push(new Date(courante));
    courante = new Date(courante);
    courante.setUTCDate(courante.getUTCDate() + 7);
    garde++;
  }
  return dates;
}
