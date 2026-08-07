"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { synchroniserFraisProf } from "@/lib/sheets";

export type EtatAction = { succes: boolean; message?: string };

export async function ajouterTrajet(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  const session = await auth();
  if (!session?.user) return { succes: false, message: "Non connecté." };

  const dateStr = String(formData.get("date") ?? "");
  const mission = String(formData.get("mission") ?? "").trim();
  const typeTrajetId = String(formData.get("typeTrajetId") ?? "");

  if (!dateStr) return { succes: false, message: "La date est requise." };
  if (!mission) return { succes: false, message: "La mission est requise." };

  const typeTrajet = await db.typeTrajet.findUnique({ where: { id: typeTrajetId } });
  if (!typeTrajet) return { succes: false, message: "Trajet introuvable." };

  await db.trajet.create({
    data: {
      profId: session.user.id,
      date: new Date(`${dateStr}T00:00:00.000Z`),
      mission,
      typeTrajetId: typeTrajet.id,
      trajetNom: typeTrajet.nom,
      km: typeTrajet.km,
      prix: typeTrajet.prix,
    },
  });

  revalidatePath("/frais");

  try {
    await synchroniserFraisProf(session.user.id);
  } catch (erreur) {
    console.error("Échec de synchronisation Google Sheets (frais) :", erreur);
  }

  return { succes: true };
}

export async function supprimerTrajet(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  const session = await auth();
  if (!session?.user) return { succes: false, message: "Non connecté." };

  const id = String(formData.get("id"));
  const trajet = await db.trajet.findUnique({ where: { id } });
  if (!trajet) return { succes: false, message: "Ce trajet n'existe plus." };
  if (trajet.profId !== session.user.id && session.user.role !== "ADMIN") {
    return { succes: false, message: "Action non autorisée." };
  }

  await db.trajet.delete({ where: { id } });
  revalidatePath("/frais");

  try {
    await synchroniserFraisProf(trajet.profId);
  } catch (erreur) {
    console.error("Échec de synchronisation Google Sheets (frais) :", erreur);
  }

  return { succes: true };
}
