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

export async function ajouterContact(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();
  const nom = String(formData.get("nom") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const communeId = String(formData.get("communeId") ?? "");

  if (!nom || !email.includes("@") || !communeId) {
    return { succes: false, message: "Merci de renseigner un nom, un email valide et une commune." };
  }

  await db.contact.create({ data: { nom, email, communeId } });
  revalidatePath("/admin/parametres/contacts");
  return { succes: true, message: `Contact « ${nom} » ajouté.` };
}

export async function basculerActifContact(formData: FormData) {
  await exigerAdmin();
  const id = String(formData.get("id"));
  const actif = formData.get("actif") === "true";
  await db.contact.update({ where: { id }, data: { actif } });
  revalidatePath("/admin/parametres/contacts");
}

export async function supprimerContact(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();
  const id = String(formData.get("id"));
  await db.contact.delete({ where: { id } });
  revalidatePath("/admin/parametres/contacts");
  return { succes: true };
}
