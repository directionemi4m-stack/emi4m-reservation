import { db } from "@/lib/db";
import { TYPES_SACEM } from "@/lib/programmes";
import type { EvenementReleve } from "@/lib/recapSacemPdf";

// Les représentations d'une période (heures musicales, concerts, auditions, autres) avec
// les œuvres jouées à chaque passage, dans l'ordre du programme.
export async function evenementsSacem(debut: Date, fin: Date) {
  return db.evenementSaison.findMany({
    where: { type: { in: [...TYPES_SACEM] }, date: { gte: debut, lt: fin } },
    orderBy: [{ date: "asc" }, { heureDebutMinutes: "asc" }],
    include: {
      lieu: true,
      inscriptions: {
        orderBy: [{ ordre: "asc" }, { creeLe: "asc" }],
        include: { morceaux: { orderBy: { ordre: "asc" } }, prof: { select: { prenom: true, nom: true } } },
      },
    },
  });
}

export type EvenementSacem = Awaited<ReturnType<typeof evenementsSacem>>[number];

export function versReleve(e: EvenementSacem): EvenementReleve {
  return {
    titre: e.titre,
    type: e.type,
    date: e.date,
    heureDebutMinutes: e.heureDebutMinutes,
    commune: e.lieu?.nom ?? null,
    lieuPrecis: e.lieuPrecis,
    passages: e.inscriptions.map((i) => ({
      interpretes: `${i.eleveNom} (${i.instrument.toLocaleLowerCase("fr")})`,
      morceaux: i.morceaux,
      programmeLibre: i.programme,
    })),
  };
}

// Période demandée (« 2026-09-01 »…), par défaut la saison en cours ; la fin est incluse.
export function lirePeriode(debutTexte: string | null | undefined, finTexte: string | null | undefined, saison: number) {
  const date = (t: string | null | undefined) => (t && /^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(`${t}T00:00:00.000Z`) : null);
  const debut = date(debutTexte) ?? new Date(Date.UTC(saison, 8, 1));
  const finIncluse = date(finTexte) ?? new Date(Date.UTC(saison + 1, 7, 31));
  return { debut, finIncluse, fin: new Date(finIncluse.getTime() + 86400000) };
}
