import { db } from "@/lib/db";

// Les jours fériés déclarés (cf. bouton « Jour férié » d'une séance), en millisecondes
// (date à minuit UTC), pour tester rapidement si une séance tombe un jour férié.
export async function joursFeries(entre?: { gte: Date; lt: Date }): Promise<Set<number>> {
  const l = await db.jourFerie.findMany({ where: entre ? { date: entre } : {}, select: { date: true } });
  return new Set(l.map((j) => j.date.getTime()));
}

export const estFerie = (feries: Set<number>, date: Date) => feries.has(date.getTime());
