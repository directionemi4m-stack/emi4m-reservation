"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lireHeuresHebdo } from "@/lib/forfaitAccessoire";
import { synchroniserActiviteAccessoireProf } from "@/lib/sheets";

export type EtatAction = { succes: boolean; message?: string };

async function exigerAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    throw new Error("Accès réservé à la direction.");
  }
}

export async function enregistrerHeuresHebdo(_etatPrecedent: EtatAction, formData: FormData): Promise<EtatAction> {
  await exigerAdmin();

  const userId = String(formData.get("userId") ?? "");
  const anneeScolaire = String(formData.get("anneeScolaire") ?? "");
  const saisie = String(formData.get("heures") ?? "").trim();
  if (!/^\d{4}-\d{4}$/.test(anneeScolaire)) return { succes: false, message: "Année scolaire invalide." };
  if (!(await db.user.findUnique({ where: { id: userId } }))) return { succes: false, message: "Salarié introuvable." };

  if (!saisie) {
    await db.heuresHebdoContrat.deleteMany({ where: { userId, anneeScolaire } });
  } else {
    const minutesHebdo = lireHeuresHebdo(saisie);
    if (minutesHebdo === null || minutesHebdo <= 0 || minutesHebdo > 40 * 60) {
      return { succes: false, message: "Saisie invalide (ex. 5, 5,5 ou 5h30)." };
    }
    await db.heuresHebdoContrat.upsert({
      where: { userId_anneeScolaire: { userId, anneeScolaire } },
      create: { userId, anneeScolaire, minutesHebdo },
      update: { minutesHebdo },
    });
  }

  revalidatePath("/admin/parametres/forfaits");
  try {
    await synchroniserActiviteAccessoireProf(userId);
  } catch (erreur) {
    console.error("Échec de synchronisation Google Sheets (activité accessoire) :", erreur);
  }
  return { succes: true, message: "Enregistré." };
}
