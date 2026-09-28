"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { synchroniserActiviteAccessoireProf } from "@/lib/sheets";
import { DUREES_ACCESSOIRE } from "@/lib/activiteAccessoire";

export type EtatAction = { succes: boolean; message?: string };

export async function ajouterActivite(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  const session = await auth();
  if (!session?.user) return { succes: false, message: "Non connecté." };

  // Un admin peut saisir une activité au nom d'un collègue (ex. remplacement) ; un
  // prof ne peut saisir que pour lui-même, quoi que contienne le champ profId.
  const profIdSaisi = String(formData.get("profId") ?? "");
  const profId = session.user.role === "ADMIN" && profIdSaisi ? profIdSaisi : session.user.id;
  if (profId !== session.user.id) {
    const cible = await db.user.findUnique({ where: { id: profId } });
    if (!cible) return { succes: false, message: "Prof introuvable." };
  }

  const dateStr = String(formData.get("date") ?? "");
  const typeEvenementId = String(formData.get("typeEvenementId") ?? "");
  const duree = String(formData.get("duree") ?? "");

  if (!dateStr) return { succes: false, message: "La date est requise." };
  if (!(DUREES_ACCESSOIRE as readonly string[]).includes(duree)) {
    return { succes: false, message: "Durée invalide." };
  }

  const typeEvenement = await db.typeEvenementAccessoire.findUnique({ where: { id: typeEvenementId } });
  if (!typeEvenement) return { succes: false, message: "Type d'événement introuvable." };

  await db.activiteAccessoire.create({
    data: {
      profId,
      date: new Date(`${dateStr}T00:00:00.000Z`),
      typeEvenementId: typeEvenement.id,
      typeEvenementNom: typeEvenement.nom,
      duree,
    },
  });

  revalidatePath("/activite-accessoire");

  try {
    await synchroniserActiviteAccessoireProf(profId);
  } catch (erreur) {
    console.error("Échec de synchronisation Google Sheets (activité accessoire) :", erreur);
  }

  return { succes: true };
}

export async function supprimerActivite(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  const session = await auth();
  if (!session?.user) return { succes: false, message: "Non connecté." };

  const id = String(formData.get("id"));
  const activite = await db.activiteAccessoire.findUnique({ where: { id } });
  if (!activite || activite.supprimeLe) return { succes: false, message: "Cette activité n'existe plus." };
  if (activite.profId !== session.user.id && session.user.role !== "ADMIN") {
    return { succes: false, message: "Action non autorisée." };
  }

  // Suppression douce : la ligne reste dans le classeur comptabilité (vidée) plutôt que
  // d'être retirée, pour ne jamais décaler un commentaire du comptable posé dessus.
  await db.activiteAccessoire.update({ where: { id }, data: { supprimeLe: new Date() } });
  revalidatePath("/activite-accessoire");

  try {
    await synchroniserActiviteAccessoireProf(activite.profId);
  } catch (erreur) {
    console.error("Échec de synchronisation Google Sheets (activité accessoire) :", erreur);
  }

  return { succes: true };
}
