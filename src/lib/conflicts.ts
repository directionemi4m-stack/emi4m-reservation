import { db } from "@/lib/db";
import type { JourSemaine } from "@/generated/prisma/client";

// getDay() : 0 = dimanche ... 6 = samedi
const JOURS_SEMAINE: JourSemaine[] = [
  "DIMANCHE",
  "LUNDI",
  "MARDI",
  "MERCREDI",
  "JEUDI",
  "VENDREDI",
  "SAMEDI",
];

const LIBELLES_JOUR: Record<JourSemaine, string> = {
  LUNDI: "lundi",
  MARDI: "mardi",
  MERCREDI: "mercredi",
  JEUDI: "jeudi",
  VENDREDI: "vendredi",
  SAMEDI: "samedi",
  DIMANCHE: "dimanche",
};

export interface CreneauCandidat {
  salleId: string;
  date: Date; // date seule (partie heure ignorée)
  heureDebut: string; // "HH:mm"
  heureFin: string; // "HH:mm"
}

export type ResultatDisponibilite =
  | { disponible: true }
  | { disponible: false; creneauBloquant: string };

function versDateHeure(heureHHmm: string): Date {
  return new Date(`1970-01-01T${heureHHmm}:00.000Z`);
}

export function formatterHeure(date: Date): string {
  return date.toISOString().slice(11, 16);
}

// Deux créneaux sont en conflit si début_A < fin_B ET début_B < fin_A.
function seChevauchent(debutA: Date, finA: Date, debutB: Date, finB: Date): boolean {
  return debutA < finB && debutB < finA;
}

export async function verifierDisponibilite(
  candidat: CreneauCandidat,
  options: { excludeDemandeCreneauId?: string } = {}
): Promise<ResultatDisponibilite> {
  const debut = versDateHeure(candidat.heureDebut);
  const fin = versDateHeure(candidat.heureFin);
  const jourSemaine = JOURS_SEMAINE[candidat.date.getDay()];

  // 1. Conflit avec l'emploi du temps de base (créneaux récurrents actifs à cette date)
  const creneauxRecurrents = await db.creneauRecurrent.findMany({
    where: {
      salleId: candidat.salleId,
      jourSemaine,
      actif: true,
      dateDebut: { lte: candidat.date },
      OR: [{ dateFin: null }, { dateFin: { gte: candidat.date } }],
    },
  });

  for (const c of creneauxRecurrents) {
    if (seChevauchent(debut, fin, c.heureDebut, c.heureFin)) {
      return {
        disponible: false,
        creneauBloquant: `Cours récurrent du ${LIBELLES_JOUR[jourSemaine]} ${formatterHeure(c.heureDebut)}–${formatterHeure(c.heureFin)}`,
      };
    }
  }

  // 2. Conflit avec des réservations déjà validées ce jour-là
  const reservationsValidees = await db.demandeCreneau.findMany({
    where: {
      salleId: candidat.salleId,
      date: candidat.date,
      statut: "VALIDEE",
      ...(options.excludeDemandeCreneauId ? { id: { not: options.excludeDemandeCreneauId } } : {}),
    },
  });

  for (const r of reservationsValidees) {
    if (seChevauchent(debut, fin, r.heureDebut, r.heureFin)) {
      return {
        disponible: false,
        creneauBloquant: `Réservation validée le ${candidat.date.toLocaleDateString("fr-FR")} ${formatterHeure(r.heureDebut)}–${formatterHeure(r.heureFin)}`,
      };
    }
  }

  return { disponible: true };
}
