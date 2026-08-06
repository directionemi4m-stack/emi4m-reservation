"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifierDisponibilite, formatterHeure } from "@/lib/conflicts";
import {
  envoyerMailDemandeValidee,
  envoyerMailDemandeRefusee,
  envoyerMailReservationAnnulee,
} from "@/lib/mail";

export type EtatAction = { succes: boolean; message?: string };

async function exigerAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    throw new Error("Accès réservé à la direction.");
  }
  return session;
}

async function chargerLigneEnAttente(id: string) {
  const ligne = await db.demandeCreneau.findUnique({
    where: { id },
    include: {
      demande: { include: { prof: true } },
      salle: { include: { commune: true } },
    },
  });

  if (!ligne || ligne.statut !== "EN_ATTENTE") {
    return null;
  }
  return ligne;
}

export async function validerCreneau(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  const session = await exigerAdmin();
  const id = String(formData.get("id"));

  const ligne = await chargerLigneEnAttente(id);
  if (!ligne) {
    return { succes: false, message: "Cette ligne n'est plus en attente." };
  }

  // Deux demandes en attente peuvent se chevaucher (le contrôle à la
  // soumission ne compare qu'aux créneaux déjà validés) : on revérifie ici.
  const resultat = await verifierDisponibilite(
    {
      salleId: ligne.salleId,
      date: ligne.date,
      heureDebut: formatterHeure(ligne.heureDebut),
      heureFin: formatterHeure(ligne.heureFin),
    },
    { excludeDemandeCreneauId: ligne.id }
  );

  if (!resultat.disponible) {
    return {
      succes: false,
      message: `Conflit détecté avec : ${resultat.creneauBloquant}. Refusez cette ligne ou traitez d'abord l'autre demande.`,
    };
  }

  await db.demandeCreneau.update({
    where: { id },
    data: { statut: "VALIDEE", traiteeLe: new Date(), traiteeParId: session!.user.id },
  });

  try {
    await envoyerMailDemandeValidee({ prof: ligne.demande.prof, salle: ligne.salle, ligne });
  } catch (erreur) {
    console.error("Échec d'envoi du mail de validation :", erreur);
  }

  revalidatePath("/admin/demandes");
  return { succes: true };
}

export async function refuserCreneau(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  const session = await exigerAdmin();
  const id = String(formData.get("id"));
  const motif = String(formData.get("motif") ?? "").trim() || undefined;

  const ligne = await chargerLigneEnAttente(id);
  if (!ligne) {
    return { succes: false, message: "Cette ligne n'est plus en attente." };
  }

  await db.demandeCreneau.update({
    where: { id },
    data: {
      statut: "REFUSEE",
      motifRefus: motif,
      traiteeLe: new Date(),
      traiteeParId: session!.user.id,
    },
  });

  try {
    await envoyerMailDemandeRefusee({ prof: ligne.demande.prof, salle: ligne.salle, ligne, motif });
  } catch (erreur) {
    console.error("Échec d'envoi du mail de refus :", erreur);
  }

  revalidatePath("/admin/demandes");
  return { succes: true };
}

export async function annulerReservationValidee(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  const session = await exigerAdmin();
  const id = String(formData.get("id"));
  const motif = String(formData.get("motif") ?? "").trim() || undefined;

  const ligne = await db.demandeCreneau.findUnique({
    where: { id },
    include: {
      demande: { include: { prof: true } },
      salle: { include: { commune: true } },
    },
  });

  if (!ligne || ligne.statut !== "VALIDEE") {
    return { succes: false, message: "Cette réservation n'est plus validée." };
  }

  await db.demandeCreneau.update({
    where: { id },
    data: {
      statut: "ANNULEE",
      motifRefus: motif,
      traiteeLe: new Date(),
      traiteeParId: session!.user.id,
    },
  });

  try {
    await envoyerMailReservationAnnulee({ prof: ligne.demande.prof, salle: ligne.salle, ligne, motif });
  } catch (erreur) {
    console.error("Échec d'envoi du mail d'annulation :", erreur);
  }

  revalidatePath("/admin/demandes");
  revalidatePath("/planning");
  revalidatePath("/demandes");
  return { succes: true };
}
