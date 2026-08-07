"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SEUIL_ALERTE_ABSENCES } from "@/lib/presences";
import { envoyerMailAlerteAbsences } from "@/lib/mail";
import { synchroniserFeuillePresence, synchroniserAbsencesProf } from "@/lib/sheets";
import type { StatutPresence, TypeAbsenceProf } from "@/generated/prisma/client";

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

  // Un pointage déjà existant pour cette séance est remplacé. Prendre l'appel
  // signifie que la séance a bien eu lieu : toute absence prof déclarée par erreur
  // pour cette date n'a plus lieu d'être.
  const [, absenceRetiree] = await Promise.all([
    db.pointage.deleteMany({ where: { seanceId } }),
    db.absenceProf.deleteMany({ where: { seanceId } }),
  ]);
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
    if (absenceRetiree.count > 0) await synchroniserAbsencesProf();
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

const TYPES_ABSENCE_VALIDES: TypeAbsenceProf[] = ["RATTRAPAGE", "ARRET_MALADIE"];

export type EtatAbsence = { succes: boolean; message?: string };

async function autoriserSeance(classeId: string, session: Session) {
  const classe = await db.classe.findUnique({ where: { id: classeId } });
  if (!classe) return null;
  if (classe.profId !== session.user.id && session.user.role !== "ADMIN") return null;
  return classe;
}

export async function signalerAbsenceProf(
  _etatPrecedent: EtatAbsence,
  formData: FormData
): Promise<EtatAbsence> {
  const session = await auth();
  if (!session?.user) return { succes: false, message: "Non connecté." };

  const classeId = String(formData.get("classeId"));
  const seanceId = String(formData.get("seanceId"));
  const typeBrut = String(formData.get("type"));
  const type = TYPES_ABSENCE_VALIDES.includes(typeBrut as TypeAbsenceProf)
    ? (typeBrut as TypeAbsenceProf)
    : null;
  const dateRattrapageBrute = String(formData.get("dateRattrapage") ?? "").trim();
  const commentaire = String(formData.get("commentaire") ?? "").trim() || null;

  if (!type) return { succes: false, message: "Type d'absence invalide." };

  const classe = await autoriserSeance(classeId, session);
  if (!classe) return { succes: false, message: "Action non autorisée." };

  const dateRattrapage =
    type === "RATTRAPAGE" && dateRattrapageBrute ? new Date(`${dateRattrapageBrute}T00:00:00.000Z`) : null;

  await db.pointage.deleteMany({ where: { seanceId } });
  await db.absenceProf.upsert({
    where: { seanceId },
    update: { type, dateRattrapage, commentaire },
    create: { seanceId, classeId, profId: session.user.id, type, dateRattrapage, commentaire },
  });

  revalidatePath(`/presences/${classeId}`);
  revalidatePath(`/presences/${classeId}/${seanceId}`);

  try {
    await synchroniserAbsencesProf();
  } catch (erreur) {
    console.error("Échec de synchronisation Google Sheets (absences) :", erreur);
  }

  redirect(`/presences/${classeId}`);
}

export async function retirerAbsenceProf(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const classeId = String(formData.get("classeId"));
  const seanceId = String(formData.get("seanceId"));

  const classe = await autoriserSeance(classeId, session);
  if (!classe) return;

  await db.absenceProf.deleteMany({ where: { seanceId } });
  revalidatePath(`/presences/${classeId}`);
  revalidatePath(`/presences/${classeId}/${seanceId}`);

  try {
    await synchroniserAbsencesProf();
  } catch (erreur) {
    console.error("Échec de synchronisation Google Sheets (absences) :", erreur);
  }
}
