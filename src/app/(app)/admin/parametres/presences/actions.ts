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

export async function ajouterLieu(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();
  const nom = String(formData.get("nom") ?? "").trim();
  if (!nom) return { succes: false, message: "Le nom du lieu est requis." };

  const existant = await db.lieuPresence.findUnique({ where: { nom } });
  if (existant) return { succes: false, message: "Ce lieu existe déjà." };

  await db.lieuPresence.create({ data: { nom } });
  revalidatePath("/admin/parametres/presences");
  return { succes: true, message: `Lieu « ${nom} » ajouté.` };
}

export async function basculerActifLieu(formData: FormData) {
  await exigerAdmin();
  const id = String(formData.get("id"));
  const actif = formData.get("actif") === "true";
  await db.lieuPresence.update({ where: { id }, data: { actif } });
  revalidatePath("/admin/parametres/presences");
}

export async function supprimerLieu(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();
  const id = String(formData.get("id"));

  try {
    await db.lieuPresence.delete({ where: { id } });
  } catch (erreur) {
    if (estErreurContrainte(erreur)) {
      return {
        succes: false,
        message: "Impossible de supprimer : des cours utilisent ce lieu. Désactivez-le à la place.",
      };
    }
    throw erreur;
  }

  revalidatePath("/admin/parametres/presences");
  return { succes: true };
}

export async function ajouterDiscipline(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();
  const nom = String(formData.get("nom") ?? "").trim();
  if (!nom) return { succes: false, message: "Le nom de la discipline est requis." };

  const existant = await db.discipline.findUnique({ where: { nom } });
  if (existant) return { succes: false, message: "Cette discipline existe déjà." };

  await db.discipline.create({ data: { nom } });
  revalidatePath("/admin/parametres/presences");
  return { succes: true, message: `Discipline « ${nom} » ajoutée.` };
}

export async function basculerActifDiscipline(formData: FormData) {
  await exigerAdmin();
  const id = String(formData.get("id"));
  const actif = formData.get("actif") === "true";
  await db.discipline.update({ where: { id }, data: { actif } });
  revalidatePath("/admin/parametres/presences");
}

export async function supprimerDiscipline(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();
  const id = String(formData.get("id"));
  await db.discipline.delete({ where: { id } });
  revalidatePath("/admin/parametres/presences");
  return { succes: true };
}

export async function ajouterNiveauFM(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();
  const nom = String(formData.get("nom") ?? "").trim();
  if (!nom) return { succes: false, message: "Le nom du niveau est requis." };

  const existant = await db.niveauFM.findUnique({ where: { nom } });
  if (existant) return { succes: false, message: "Ce niveau existe déjà." };

  await db.niveauFM.create({ data: { nom } });
  revalidatePath("/admin/parametres/presences");
  return { succes: true, message: `Niveau « ${nom} » ajouté.` };
}

export async function basculerActifNiveauFM(formData: FormData) {
  await exigerAdmin();
  const id = String(formData.get("id"));
  const actif = formData.get("actif") === "true";
  await db.niveauFM.update({ where: { id }, data: { actif } });
  revalidatePath("/admin/parametres/presences");
}

export async function supprimerNiveauFM(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();
  const id = String(formData.get("id"));

  try {
    await db.niveauFM.delete({ where: { id } });
  } catch (erreur) {
    if (estErreurContrainte(erreur)) {
      return {
        succes: false,
        message: "Impossible de supprimer : des cours utilisent ce niveau. Désactivez-le à la place.",
      };
    }
    throw erreur;
  }

  revalidatePath("/admin/parametres/presences");
  return { succes: true };
}
