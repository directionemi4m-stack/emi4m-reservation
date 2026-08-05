"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifierDisponibilite } from "@/lib/conflicts";
import { envoyerMailNouvelleDemande } from "@/lib/mail";
import type { StatutCreneau } from "@/generated/prisma/client";

export interface LigneDemandeInput {
  date: string; // "YYYY-MM-DD"
  heureDebut: string; // "HH:mm"
  heureFin: string; // "HH:mm"
}

export interface LigneResultat extends LigneDemandeInput {
  statut: StatutCreneau;
  creneauBloquant?: string;
}

export type ResultatDepot =
  | { succes: true; lignes: LigneResultat[] }
  | { succes: false; message: string };

function versDateJour(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function versDateHeure(heure: string): Date {
  return new Date(`1970-01-01T${heure}:00.000Z`);
}

export async function deposerDemande(
  salleId: string,
  lignes: LigneDemandeInput[]
): Promise<ResultatDepot> {
  const session = await auth();
  if (!session?.user) {
    return { succes: false, message: "Vous devez être connecté·e." };
  }

  if (!salleId || lignes.length === 0) {
    return { succes: false, message: "Sélectionnez une salle et au moins une date." };
  }

  for (const ligne of lignes) {
    if (!ligne.date || !ligne.heureDebut || !ligne.heureFin || ligne.heureDebut >= ligne.heureFin) {
      return {
        succes: false,
        message: "Chaque ligne doit avoir une date et une plage horaire valide (fin après début).",
      };
    }
  }

  const [salle, prof] = await Promise.all([
    db.salle.findUnique({ where: { id: salleId }, include: { commune: true } }),
    db.user.findUnique({ where: { id: session.user.id } }),
  ]);
  if (!salle) {
    return { succes: false, message: "Salle introuvable." };
  }
  if (!prof) {
    return { succes: false, message: "Compte introuvable." };
  }

  const resultatsConflits = await Promise.all(
    lignes.map((ligne) =>
      verifierDisponibilite({
        salleId,
        date: versDateJour(ligne.date),
        heureDebut: ligne.heureDebut,
        heureFin: ligne.heureFin,
      })
    )
  );

  const maintenant = new Date();

  const demande = await db.demande.create({
    data: {
      profId: session.user.id,
      salleId,
      creneaux: {
        create: lignes.map((ligne, i) => {
          const resultat = resultatsConflits[i];
          const base = {
            salleId,
            date: versDateJour(ligne.date),
            heureDebut: versDateHeure(ligne.heureDebut),
            heureFin: versDateHeure(ligne.heureFin),
          };

          if (!resultat.disponible) {
            return {
              ...base,
              statut: "REFUSEE" as const,
              rejetAutomatique: true,
              creneauBloquant: resultat.creneauBloquant,
              traiteeLe: maintenant,
            };
          }

          return { ...base, statut: "EN_ATTENTE" as const };
        }),
      },
    },
    include: { creneaux: true },
  });

  const enAttente = demande.creneaux.filter((c) => c.statut === "EN_ATTENTE");
  const refusees = demande.creneaux.filter((c) => c.statut === "REFUSEE");

  if (enAttente.length > 0) {
    try {
      await envoyerMailNouvelleDemande({
        prof,
        salle,
        enAttente,
        refusees,
      });
    } catch (erreur) {
      console.error("Échec d'envoi du mail de nouvelle demande :", erreur);
    }
  }

  revalidatePath("/demandes");

  return {
    succes: true,
    lignes: lignes.map((ligne, i) => ({
      ...ligne,
      statut: resultatsConflits[i].disponible ? "EN_ATTENTE" : "REFUSEE",
      creneauBloquant: resultatsConflits[i].disponible
        ? undefined
        : resultatsConflits[i].creneauBloquant,
    })),
  };
}
