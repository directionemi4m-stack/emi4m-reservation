"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { genererDatesSeances } from "@/lib/presences";
import { supprimerFeuillePresence } from "@/lib/sheets";

export type EtatAction = { succes: boolean; message?: string };

async function exigerConnecte() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Non connecté.");
  }
  return session;
}

export async function creerClasse(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  const session = await exigerConnecte();

  const jour = String(formData.get("jour") ?? "").trim() || null;
  const dateDebutStr = String(formData.get("dateDebut") ?? "");
  const emoji = String(formData.get("emoji") ?? "🎼");
  const disciplineId = String(formData.get("disciplineId") ?? "");

  if (!dateDebutStr) {
    return { succes: false, message: "La date du premier cours est requise." };
  }
  const dateDebut = new Date(`${dateDebutStr}T00:00:00.000Z`);

  const discipline = await db.discipline.findUnique({ where: { id: disciplineId } });
  if (!discipline) {
    return { succes: false, message: "Discipline introuvable." };
  }
  const type = discipline.type;

  let nom: string;
  let lieuId: string | null = null;
  let niveauFMId: string | null = null;

  if (type === "INSTRUMENT") {
    nom = discipline.nom;
  } else {
    niveauFMId = String(formData.get("niveauFMId") ?? "") || null;
    const lieuIdBrut = String(formData.get("lieuId") ?? "");
    lieuId = lieuIdBrut || null;

    if (!niveauFMId) {
      return { succes: false, message: "Le niveau FM est requis." };
    }
    const niveau = await db.niveauFM.findUnique({ where: { id: niveauFMId } });
    if (!niveau) {
      return { succes: false, message: "Niveau FM introuvable." };
    }
    nom = /^fm/i.test(niveau.nom) ? niveau.nom : `FM ${niveau.nom}`;
  }

  const dates = genererDatesSeances(dateDebut);

  const classe = await db.classe.create({
    data: {
      profId: session.user.id,
      type,
      nom,
      emoji,
      jour,
      lieuId: type === "FM" ? lieuId : null,
      niveauFMId: type === "FM" ? niveauFMId : null,
      dateDebut,
      seances: { create: dates.map((date) => ({ date })) },
    },
  });

  revalidatePath("/presences");
  redirect(`/presences/${classe.id}`);
}

export async function supprimerClasse(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  const session = await exigerConnecte();
  const id = String(formData.get("id"));

  const classe = await db.classe.findUnique({ where: { id } });
  if (!classe) {
    return { succes: false, message: "Ce cours n'existe plus." };
  }
  if (classe.profId !== session.user.id && session.user.role !== "ADMIN") {
    return { succes: false, message: "Vous ne pouvez pas supprimer ce cours." };
  }

  await db.classe.delete({ where: { id } });
  revalidatePath("/presences");

  try {
    await supprimerFeuillePresence(classe);
  } catch (erreur) {
    console.error("Échec de suppression de l'onglet Google Sheets :", erreur);
  }

  return { succes: true };
}
