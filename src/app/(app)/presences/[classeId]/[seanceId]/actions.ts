"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SEUIL_ALERTE_ABSENCES } from "@/lib/presences";
import { envoyerMailAlerteAbsences } from "@/lib/mail";
import { synchroniserFeuillePresence } from "@/lib/sheets";
import type { StatutPresence } from "@/generated/prisma/client";

export type EtatAction = { succes: boolean; message?: string };

const STATUTS_VALIDES: StatutPresence[] = ["PRESENT", "ABSENT", "EXCUSE"];

export async function enregistrerPointage(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  const session = await auth();
  if (!session?.user) return { succes: false, message: "Non connecté." };

  const classeId = String(formData.get("classeId"));
  const seanceId = String(formData.get("seanceId"));

  const [classe, prof] = await Promise.all([
    db.classe.findUnique({ where: { id: classeId }, include: { eleves: { where: { actif: true } } } }),
    db.user.findUnique({ where: { id: session.user.id } }),
  ]);
  if (!classe || !prof) return { succes: false, message: "Cours introuvable." };
  if (classe.profId !== session.user.id && session.user.role !== "ADMIN") {
    return { succes: false, message: "Action non autorisée." };
  }

  const marques = classe.eleves.map((eleve) => {
    const brut = String(formData.get(`statut-${eleve.id}`) ?? "PRESENT");
    const statut = STATUTS_VALIDES.includes(brut as StatutPresence)
      ? (brut as StatutPresence)
      : "PRESENT";
    return { eleveId: eleve.id, statut };
  });

  // Un pointage déjà existant pour cette séance est remplacé.
  await db.pointage.deleteMany({ where: { seanceId } });
  await db.pointage.create({
    data: {
      seanceId,
      classeId,
      profId: session.user.id,
      marques: { create: marques },
    },
  });

  revalidatePath(`/presences/${classeId}`);
  revalidatePath("/presences/historique");

  try {
    await synchroniserFeuillePresence(classeId);
  } catch (erreur) {
    console.error("Échec de synchronisation Google Sheets :", erreur);
  }

  // Seuil d'absences injustifiées, cumulées par élève sur ce cours.
  const alertes: Array<{ nom: string; total: number }> = [];
  for (const eleve of classe.eleves) {
    if (marques.find((m) => m.eleveId === eleve.id)?.statut !== "ABSENT") continue;
    const total = await db.presenceMarque.count({ where: { eleveId: eleve.id, statut: "ABSENT" } });
    if (total >= SEUIL_ALERTE_ABSENCES) alertes.push({ nom: eleve.nom, total });
  }

  if (alertes.length > 0) {
    try {
      await envoyerMailAlerteAbsences({ prof, classe: classe.nom, alertes });
    } catch (erreur) {
      console.error("Échec d'envoi du mail d'alerte absences :", erreur);
    }
  }

  redirect(`/presences/${classeId}`);
}
