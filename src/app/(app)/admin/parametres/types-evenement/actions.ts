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

function estErreurContrainte(erreur: unknown): boolean {
  return (
    !!erreur &&
    typeof erreur === "object" &&
    "code" in erreur &&
    (erreur.code === "P2003" || erreur.code === "P2039")
  );
}

export async function ajouterTypeEvenement(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();
  const nom = String(formData.get("nom") ?? "").trim();

  if (!nom) return { succes: false, message: "Le nom du type d'événement est requis." };

  const existant = await db.typeEvenementAccessoire.findUnique({ where: { nom } });
  if (existant) return { succes: false, message: "Ce type d'événement existe déjà." };

  await db.typeEvenementAccessoire.create({ data: { nom } });
  revalidatePath("/admin/parametres/types-evenement");
  return { succes: true, message: `Type « ${nom} » ajouté.` };
}

export async function basculerActifTypeEvenement(formData: FormData) {
  await exigerAdmin();
  const id = String(formData.get("id"));
  const actif = formData.get("actif") === "true";
  await db.typeEvenementAccessoire.update({ where: { id }, data: { actif } });
  revalidatePath("/admin/parametres/types-evenement");
}

export async function supprimerTypeEvenement(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();
  const id = String(formData.get("id"));

  try {
    await db.typeEvenementAccessoire.delete({ where: { id } });
  } catch (erreur) {
    if (estErreurContrainte(erreur)) {
      return {
        succes: false,
        message: "Impossible de supprimer : des activités enregistrées utilisent ce type. Désactivez-le à la place.",
      };
    }
    throw erreur;
  }

  revalidatePath("/admin/parametres/types-evenement");
  return { succes: true };
}
