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

export async function ajouterTypeTrajet(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();
  const nom = String(formData.get("nom") ?? "").trim();
  const km = Number(formData.get("km"));
  const prix = Number(formData.get("prix"));

  if (!nom) return { succes: false, message: "Le nom du trajet est requis." };
  if (!Number.isFinite(km) || km <= 0) return { succes: false, message: "Distance (km) invalide." };
  if (!Number.isFinite(prix) || prix <= 0) return { succes: false, message: "Prix invalide." };

  const existant = await db.typeTrajet.findUnique({ where: { nom } });
  if (existant) return { succes: false, message: "Ce trajet existe déjà." };

  await db.typeTrajet.create({ data: { nom, km, prix } });
  revalidatePath("/admin/parametres/trajets");
  return { succes: true, message: `Trajet « ${nom} » ajouté.` };
}

export async function basculerActifTypeTrajet(formData: FormData) {
  await exigerAdmin();
  const id = String(formData.get("id"));
  const actif = formData.get("actif") === "true";
  await db.typeTrajet.update({ where: { id }, data: { actif } });
  revalidatePath("/admin/parametres/trajets");
}

export async function supprimerTypeTrajet(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();
  const id = String(formData.get("id"));

  try {
    await db.typeTrajet.delete({ where: { id } });
  } catch (erreur) {
    if (estErreurContrainte(erreur)) {
      return {
        succes: false,
        message: "Impossible de supprimer : des trajets enregistrés utilisent ce type. Désactivez-le à la place.",
      };
    }
    throw erreur;
  }

  revalidatePath("/admin/parametres/trajets");
  return { succes: true };
}
