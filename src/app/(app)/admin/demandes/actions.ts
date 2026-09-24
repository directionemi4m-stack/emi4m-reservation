"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifierDisponibilite, formatterHeure } from "@/lib/conflicts";
import {
  envoyerMailDemandeValidee,
  envoyerMailDemandeRefusee,
  envoyerMailReservationAnnulee,
  envoyerMailReservationModifiee,
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

// Déplace une réservation DÉJÀ validée (salle, date, horaires) sans l'annuler puis la
// refaire. Le conflit est recalculé en ignorant la réservation elle-même ; le prof est
// prévenu par mail sauf si la direction décoche l'option.
export async function modifierReservationValidee(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();

  const id = String(formData.get("id") ?? "");
  const salleId = String(formData.get("salleId") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  const heureDebut = String(formData.get("heureDebut") ?? "");
  const heureFin = String(formData.get("heureFin") ?? "");
  const prevenir = formData.get("prevenir") === "on";

  if (!salleId || !dateStr || !heureDebut || !heureFin) {
    return { succes: false, message: "Merci de remplir tous les champs." };
  }
  if (heureDebut >= heureFin) {
    return { succes: false, message: "L'heure de fin doit être après l'heure de début." };
  }
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return { succes: false, message: "Date invalide." };
  }

  const ligne = await db.demandeCreneau.findUnique({
    where: { id },
    include: { demande: { include: { prof: true } }, salle: { include: { commune: true } } },
  });
  if (!ligne || ligne.statut !== "VALIDEE") {
    return { succes: false, message: "Cette réservation n'est plus validée." };
  }

  const nouvelleSalle = await db.salle.findUnique({
    where: { id: salleId },
    include: { commune: true },
  });
  if (!nouvelleSalle || !nouvelleSalle.actif) {
    return { succes: false, message: "Salle introuvable." };
  }

  const resultat = await verifierDisponibilite(
    { salleId, date, heureDebut, heureFin },
    { excludeDemandeCreneauId: id }
  );
  if (!resultat.disponible) {
    return { succes: false, message: `Conflit : ${resultat.creneauBloquant}` };
  }

  const nouvelleDebut = new Date(`1970-01-01T${heureDebut}:00.000Z`);
  const nouvelleFin = new Date(`1970-01-01T${heureFin}:00.000Z`);
  const modifiee =
    salleId !== ligne.salleId ||
    date.getTime() !== ligne.date.getTime() ||
    nouvelleDebut.getTime() !== ligne.heureDebut.getTime() ||
    nouvelleFin.getTime() !== ligne.heureFin.getTime();

  if (modifiee) {
    await db.demandeCreneau.update({
      where: { id },
      data: { salleId, date, heureDebut: nouvelleDebut, heureFin: nouvelleFin },
    });

    if (prevenir) {
      try {
        await envoyerMailReservationModifiee({
          prof: ligne.demande.prof,
          ancienne: ligne,
          nouvelle: { salle: nouvelleSalle, date, heureDebut: nouvelleDebut, heureFin: nouvelleFin },
        });
      } catch (erreur) {
        console.error("Échec d'envoi du mail de modification :", erreur);
      }
    }
  }

  revalidatePath("/planning");
  revalidatePath("/demandes");
  revalidatePath("/admin/demandes");
  // Repart sur la page sans « ?modifier= » : l'éditeur se referme, la liste est à jour.
  redirect(`/admin/demandes#ligne-${id}`);
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
