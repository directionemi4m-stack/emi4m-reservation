import { db } from "@/lib/db";
import { calendrierParDefaut, periodeCourante, type CalendrierBulletins } from "@/lib/bulletinsCham";

// Les dates d'une année scolaire : celles réglées par la direction, sinon les dates habituelles
// (15 novembre, 15 février, 15 mai, et relance 4 jours après).
export async function lireCalendrierBulletins(anneeDebut: number): Promise<CalendrierBulletins> {
  const calendrier = calendrierParDefaut(anneeDebut);
  const lignes = await db.calendrierBulletinCham.findMany({ where: { anneeDebut } });
  for (const l of lignes) calendrier[l.trimestre] = { ouverture: l.ouverture, relance: l.relance };
  return calendrier;
}

// Le trimestre en cours à une date donnée, d'après le calendrier de son année scolaire.
export async function contexteBulletins(date: Date) {
  const { anneeDebut } = periodeCourante(date);
  const calendrier = await lireCalendrierBulletins(anneeDebut);
  return { calendrier, periode: periodeCourante(date, calendrier) };
}
