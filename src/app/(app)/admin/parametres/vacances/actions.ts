"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type EtatAction = { succes: boolean; message?: string };

async function exigerAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    throw new Error("Accès réservé à la direction.");
  }
}

export async function ajouterPeriodeVacances(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();

  const nom = String(formData.get("nom") ?? "").trim();
  const debutStr = String(formData.get("debut") ?? "");
  const finStr = String(formData.get("fin") ?? "");

  if (!nom) return { succes: false, message: "Le nom de la période est requis." };
  if (!debutStr || !finStr) return { succes: false, message: "Les deux dates sont requises." };

  const debut = new Date(`${debutStr}T00:00:00.000Z`);
  const fin = new Date(`${finStr}T00:00:00.000Z`);
  if (fin <= debut) {
    return { succes: false, message: "La date de reprise doit être après le début." };
  }

  await db.periodeVacances.create({ data: { nom, debut, fin } });
  revalidatePath("/admin/parametres/vacances");
  return { succes: true, message: `Période « ${nom} » ajoutée.` };
}

export async function supprimerPeriodeVacances(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();
  const id = String(formData.get("id"));

  await db.periodeVacances.delete({ where: { id } });
  revalidatePath("/admin/parametres/vacances");
  return { succes: true };
}
