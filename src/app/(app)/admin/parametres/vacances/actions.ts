"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { synchroniserVacancesOfficielles } from "@/lib/vacances";

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

// Un cron hebdomadaire appelle déjà synchroniserVacancesOfficielles (cf.
// api/cron/synchroniser-vacances) ; ce bouton permet de forcer un rafraîchissement
// immédiat sans attendre la prochaine exécution planifiée.
export async function synchroniserVacancesMaintenant(
  _etatPrecedent: EtatAction,
  _formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();

  try {
    const { ajoutees, misesAJour } = await synchroniserVacancesOfficielles();
    revalidatePath("/admin/parametres/vacances");
    if (ajoutees === 0 && misesAJour === 0) {
      return { succes: true, message: "Déjà à jour, rien de nouveau." };
    }
    return {
      succes: true,
      message: `${ajoutees} période(s) ajoutée(s), ${misesAJour} mise(s) à jour.`,
    };
  } catch (erreur) {
    console.error("Synchronisation manuelle des vacances scolaires en échec :", erreur);
    return { succes: false, message: "Synchronisation impossible, réessayez plus tard." };
  }
}
