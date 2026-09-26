"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AUTORISATIONS } from "@/lib/cham";
import type { AutorisationSortie } from "@/generated/prisma/client";

export type EtatAction = { succes: boolean; message?: string };

// Toute modification de la liste CHAM est réservée à la direction — vérifié ici, côté
// serveur : masquer les boutons ne suffirait pas.
async function exigerAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    throw new Error("Accès réservé à la direction.");
  }
}

function texteOuNull(formData: FormData, nom: string) {
  return String(formData.get(nom) ?? "").trim() || null;
}

interface ChampsEleve {
  prenom: string;
  nom: string;
  age: number | null;
  telephone: string | null;
  email: string | null;
  ville: string | null;
}

function lireChampsEleve(formData: FormData): { erreur: string } | { champs: ChampsEleve } {
  const prenom = String(formData.get("prenom") ?? "").trim();
  const nom = String(formData.get("nom") ?? "").trim();
  if (!prenom || !nom) return { erreur: "Le prénom et le nom sont obligatoires." };

  const ageBrut = String(formData.get("age") ?? "").trim();
  let age: number | null = null;
  if (ageBrut) {
    age = Number(ageBrut);
    if (!Number.isInteger(age) || age < 3 || age > 25) return { erreur: "Âge invalide." };
  }

  const email = texteOuNull(formData, "email")?.toLowerCase() ?? null;
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { erreur: "Adresse e-mail invalide." };

  return {
    champs: {
      prenom,
      nom,
      age,
      telephone: texteOuNull(formData, "telephone"),
      email,
      ville: texteOuNull(formData, "ville"),
    },
  };
}

export async function ajouterEleveCham(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();

  const lu = lireChampsEleve(formData);
  if ("erreur" in lu) return { succes: false, message: lu.erreur };

  await db.eleveCham.create({ data: lu.champs });
  revalidatePath("/cham");
  return { succes: true, message: `${lu.champs.prenom} ${lu.champs.nom} ajouté(e).` };
}

export async function modifierEleveCham(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();

  const id = String(formData.get("id") ?? "");
  const lu = lireChampsEleve(formData);
  if ("erreur" in lu) return { succes: false, message: lu.erreur };

  const existant = await db.eleveCham.findUnique({ where: { id }, select: { id: true } });
  if (!existant) return { succes: false, message: "Cet élève n'existe plus." };

  await db.eleveCham.update({ where: { id }, data: lu.champs });
  revalidatePath("/cham");
  return { succes: true, message: "Modifications enregistrées." };
}

export async function enregistrerSortieCham(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();

  const id = String(formData.get("id") ?? "");
  const autorisationSortie = String(formData.get("autorisationSortie") ?? "") as AutorisationSortie;
  const precisionsSortie = texteOuNull(formData, "precisionsSortie");

  if (!AUTORISATIONS.includes(autorisationSortie)) {
    return { succes: false, message: "Valeur invalide." };
  }
  if (precisionsSortie && precisionsSortie.length > 300) {
    return { succes: false, message: "Précisions trop longues (300 caractères max)." };
  }

  const existant = await db.eleveCham.findUnique({ where: { id }, select: { id: true } });
  if (!existant) return { succes: false, message: "Cet élève n'existe plus." };

  await db.eleveCham.update({ where: { id }, data: { autorisationSortie, precisionsSortie } });
  revalidatePath("/cham");
  return { succes: true, message: "Enregistré" };
}

export async function supprimerEleveCham(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();

  const id = String(formData.get("id") ?? "");
  await db.eleveCham.deleteMany({ where: { id } });
  revalidatePath("/cham");
  return { succes: true };
}
