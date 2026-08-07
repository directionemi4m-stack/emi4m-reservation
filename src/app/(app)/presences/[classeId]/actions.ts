"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { synchroniserFeuillePresence } from "@/lib/sheets";

export type EtatAction = { succes: boolean; message?: string };

async function chargerClasseAutorisee(classeId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Non connecté.");

  const classe = await db.classe.findUnique({ where: { id: classeId } });
  if (!classe) return { classe: null, session };
  if (classe.profId !== session.user.id && session.user.role !== "ADMIN") {
    return { classe: null, session };
  }
  return { classe, session };
}

export async function ajouterEleve(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  const classeId = String(formData.get("classeId"));
  const nom = String(formData.get("nom") ?? "").trim();
  if (!nom) return { succes: false, message: "Le nom de l'élève est requis." };

  const { classe } = await chargerClasseAutorisee(classeId);
  if (!classe) return { succes: false, message: "Cours introuvable." };

  await db.eleve.create({ data: { classeId, nom } });
  revalidatePath(`/presences/${classeId}`);

  try {
    await synchroniserFeuillePresence(classeId);
  } catch (erreur) {
    console.error("Échec de synchronisation Google Sheets (présences) :", erreur);
  }

  return { succes: true };
}

export async function supprimerEleve(formData: FormData) {
  const classeId = String(formData.get("classeId"));
  const eleveId = String(formData.get("eleveId"));

  const { classe } = await chargerClasseAutorisee(classeId);
  if (!classe) return;

  await db.eleve.delete({ where: { id: eleveId } });
  revalidatePath(`/presences/${classeId}`);

  try {
    await synchroniserFeuillePresence(classeId);
  } catch (erreur) {
    console.error("Échec de synchronisation Google Sheets (présences) :", erreur);
  }
}

export async function ajouterSeance(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  const classeId = String(formData.get("classeId"));
  const dateStr = String(formData.get("date") ?? "");
  if (!dateStr) return { succes: false, message: "La date est requise." };

  const { classe } = await chargerClasseAutorisee(classeId);
  if (!classe) return { succes: false, message: "Cours introuvable." };

  await db.seance.create({
    data: { classeId, date: new Date(`${dateStr}T00:00:00.000Z`) },
  });
  revalidatePath(`/presences/${classeId}`);
  return { succes: true };
}

export async function modifierDateSeance(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  const classeId = String(formData.get("classeId"));
  const seanceId = String(formData.get("seanceId"));
  const dateStr = String(formData.get("date") ?? "");
  if (!dateStr) return { succes: false, message: "La date est requise." };

  const { classe } = await chargerClasseAutorisee(classeId);
  if (!classe) return { succes: false, message: "Cours introuvable." };

  await db.seance.update({
    where: { id: seanceId },
    data: { date: new Date(`${dateStr}T00:00:00.000Z`) },
  });
  revalidatePath(`/presences/${classeId}`);

  try {
    await synchroniserFeuillePresence(classeId);
  } catch (erreur) {
    console.error("Échec de synchronisation Google Sheets (présences) :", erreur);
  }

  return { succes: true };
}
