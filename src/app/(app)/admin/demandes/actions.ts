"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifierDisponibilite, formatterHeure } from "@/lib/conflicts";
import {
  envoyerMailDemandeValidee,
  envoyerMailDemandeRefusee,
  envoyerMailReservationAnnulee,
  envoyerMailDemandeSalle,
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

export type EtatEnvoiMail = { statut: "idle" | "envoye" | "erreur"; message?: string };

export async function envoyerDemandeMail(params: {
  destinataires: { nom: string; email: string }[];
  sujet: string;
  corps: string;
}): Promise<EtatEnvoiMail> {
  await exigerAdmin();

  if (params.destinataires.length === 0) {
    return { statut: "erreur", message: "Ajoutez au moins un destinataire." };
  }
  if (!params.sujet.trim() || !params.corps.trim()) {
    return { statut: "erreur", message: "L'objet et le message ne peuvent pas être vides." };
  }

  try {
    await envoyerMailDemandeSalle(params);
  } catch (erreur) {
    console.error("Échec d'envoi de la demande de salle :", erreur);
    return { statut: "erreur", message: "L'envoi a échoué. Réessayez." };
  }

  return { statut: "envoye" };
}

// Suppression administrative silencieuse (pas de mail) : contrairement à
// Refuser/Annuler qui notifient le prof d'une décision, ceci retire la ligne
// sans laisser de trace, pour corriger une erreur de saisie ou nettoyer.
export async function supprimerLigneDemande(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();
  const id = String(formData.get("id"));

  const ligne = await db.demandeCreneau.findUnique({
    where: { id },
    select: { demandeId: true },
  });
  if (!ligne) {
    return { succes: false, message: "Cette ligne n'existe plus." };
  }

  await db.demandeCreneau.delete({ where: { id } });

  const restantes = await db.demandeCreneau.count({ where: { demandeId: ligne.demandeId } });
  if (restantes === 0) {
    await db.demande.delete({ where: { id: ligne.demandeId } });
  }

  revalidatePath("/admin/demandes");
  revalidatePath("/planning");
  revalidatePath("/demandes");
  return { succes: true };
}
