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

function slugifier(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

export async function ajouterCommune(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();

  const nom = String(formData.get("nom") ?? "").trim();
  if (!nom) {
    return { succes: false, message: "Le nom de la commune est requis." };
  }

  const slug = slugifier(nom);
  const existante = await db.commune.findFirst({ where: { OR: [{ nom }, { slug }] } });
  if (existante) {
    return { succes: false, message: "Cette commune existe déjà." };
  }

  await db.commune.create({ data: { nom, slug } });
  revalidatePath("/admin/parametres/salles");

  return { succes: true, message: `Commune « ${nom} » ajoutée.` };
}

export async function ajouterSalle(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();

  const communeId = String(formData.get("communeId") ?? "");
  const nom = String(formData.get("nom") ?? "").trim();

  if (!communeId || !nom) {
    return { succes: false, message: "Merci de choisir une commune et de saisir un nom." };
  }

  const existante = await db.salle.findFirst({ where: { communeId, nom } });
  if (existante) {
    return { succes: false, message: "Une salle porte déjà ce nom dans cette commune." };
  }

  await db.salle.create({ data: { communeId, nom } });
  revalidatePath("/admin/parametres/salles");

  return { succes: true, message: `Salle « ${nom} » ajoutée.` };
}

export async function basculerActifSalle(formData: FormData) {
  await exigerAdmin();

  const salleId = String(formData.get("salleId"));
  const actif = formData.get("actif") === "true";

  await db.salle.update({ where: { id: salleId }, data: { actif } });
  revalidatePath("/admin/parametres/salles");
}
