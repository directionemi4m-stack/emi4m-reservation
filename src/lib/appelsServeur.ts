import { db } from "@/lib/db";
import { appelAFaire, appelEnRetard, bornesAppels } from "@/lib/appels";

export function aujourdHuiUTC(maintenant = new Date()) {
  return new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate()));
}

// Les séances des 3 dernières semaines sans appel ni absence du prof (d'un prof, ou de tous).
export async function seancesSansAppel(aujourdHui: Date, profId?: string) {
  const seances = await db.seance.findMany({
    where: {
      date: bornesAppels(aujourdHui),
      pointage: { is: null },
      absenceProf: { is: null },
      classe: { actif: true, ...(profId ? { profId } : { prof: { actif: true } }) },
    },
    select: {
      id: true,
      date: true,
      classe: { select: { id: true, nom: true, emoji: true, dateDebut: true, prof: { select: { id: true, prenom: true, nom: true } } } },
    },
    orderBy: { date: "asc" },
  });
  // Une séance d'avant le début du cours ne compte pas (cours créé en cours d'année).
  return seances
    .filter((s) => s.date >= s.classe.dateDebut && appelAFaire({ date: s.date, aUnAppel: false }, aujourdHui))
    .map((s) => ({ ...s, enRetard: appelEnRetard({ date: s.date, aUnAppel: false }, aujourdHui) }));
}
