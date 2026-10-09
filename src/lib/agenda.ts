// Emploi du temps hebdomadaire des profs : calculs purs (aucun accès base), utilisables
// côté client comme côté serveur, et testés dans agenda.test.ts.

export const DUREES_INDIVIDUEL = [30, 45, 60] as const;
// Le collectif (FM, ensembles, chorale…) a des durées libres, par pas de 15 min.
export const DUREES_COLLECTIF = [30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240] as const;

export const HEURE_MIN = 6 * 60;
export const HEURE_MAX = 23 * 60;

export interface CreneauCalcul {
  jourSemaine: string;
  heureDebutMinutes: number;
  dureeMinutes: number;
  uneSemaineSurDeux: boolean;
}

// « 14:15 » → 855 ; null si le texte n'est pas une heure valide.
export function heureVersMinutes(texte: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(texte.trim());
  if (!m) return null;
  const heures = Number(m[1]);
  const minutes = Number(m[2]);
  if (heures > 23 || minutes > 59) return null;
  return heures * 60 + minutes;
}

// 855 → « 14h15 » (affichage), ou « 14:15 » avec separateur ":" (champ <input type=time>).
export function minutesVersHeure(total: number, separateur: "h" | ":" = "h"): string {
  const heures = Math.floor(total / 60);
  const minutes = total % 60;
  return `${separateur === ":" ? String(heures).padStart(2, "0") : heures}${separateur}${String(minutes).padStart(2, "0")}`;
}

// Temps moyen par semaine d'un créneau : un cours une semaine sur deux compte pour moitié.
export function minutesHebdo(c: Pick<CreneauCalcul, "dureeMinutes" | "uneSemaineSurDeux">): number {
  return c.uneSemaineSurDeux ? c.dureeMinutes / 2 : c.dureeMinutes;
}

export function volumeHebdoMinutes(creneaux: Pick<CreneauCalcul, "dureeMinutes" | "uneSemaineSurDeux">[]): number {
  return creneaux.reduce((total, c) => total + minutesHebdo(c), 0);
}

function nombreFr(n: number): string {
  return String(n).replace(".", ",");
}

// 750 → « 12 h 30 » ; 742,5 → « 12 h 22,5 » (une demi-minute exacte, pas d'arrondi caché
// dans un volume qui sert aux contrats) ; 45 → « 45 min ».
export function formaterDuree(minutes: number): string {
  if (minutes < 60) return `${nombreFr(minutes)} min`;
  const heures = Math.floor(minutes / 60);
  const reste = minutes - heures * 60;
  if (reste === 0) return `${heures} h`;
  const resteTexte = Number.isInteger(reste) ? String(reste).padStart(2, "0") : nombreFr(reste);
  return `${heures} h ${resteTexte}`;
}

// 742,5 min → « 12,375 » h : les durées étant des multiples de 7,5 min, trois décimales
// suffisent toujours à un résultat exact.
export function heuresDecimales(minutes: number): string {
  return nombreFr(Math.round((minutes / 60) * 1000) / 1000);
}

function normaliserNomLieu(nom: string) {
  return nom
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Les lieux de Présences (« Saint-Nizier ») et les communes des salles
// (« Saint-Nizier-du-Moucherotte ») ne portent pas exactement le même nom : on les
// rapproche si l'un est le début de l'autre, accents et ponctuation ignorés.
export function memeCommune(lieu: string, commune: string): boolean {
  const a = normaliserNomLieu(lieu);
  const b = normaliserNomLieu(commune);
  if (!a || !b) return false;
  return a === b || a.startsWith(`${b}-`) || b.startsWith(`${a}-`);
}

// Deux cours du même jour qui se recouvrent. Deux cours « une semaine sur deux » peuvent
// partager un créneau (ils alternent) : ce n'est pas un conflit.
export function chevauchement(a: CreneauCalcul, b: CreneauCalcul): boolean {
  if (a.jourSemaine !== b.jourSemaine) return false;
  if (a.uneSemaineSurDeux && b.uneSemaineSurDeux) return false;
  const finA = a.heureDebutMinutes + a.dureeMinutes;
  const finB = b.heureDebutMinutes + b.dureeMinutes;
  return a.heureDebutMinutes < finB && b.heureDebutMinutes < finA;
}
