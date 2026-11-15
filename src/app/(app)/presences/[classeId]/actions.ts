"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { synchroniserFeuillePresence } from "@/lib/sheets";
import { differenceAgenda } from "@/lib/agendaEnsemble";

export type EtatAction = { succes: boolean; message?: string };

async function chargerClasseAutorisee(classeId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Non connecté.");

  const classe = await db.classe.findUnique({ where: { id: classeId } });
  if (!classe) return { classe: null, session };
  if (classe.profId !== session.user.id && session.user.role !== "ADMIN") {
    return { classe: null, session };
  }
  return { classe, session };
}

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function ajouterEleve(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  const classeId = String(formData.get("classeId"));
  const nom = String(formData.get("nom") ?? "").trim().slice(0, 120);
  if (!nom) return { succes: false, message: "Le nom de l'élève est requis." };

  const { classe } = await chargerClasseAutorisee(classeId);
  if (!classe) return { succes: false, message: "Cours introuvable." };

  await db.eleve.create({ data: { classeId, nom } });
  revalidatePath(`/presences/${classeId}`);

  try {
    await synchroniserFeuillePresence(classeId);
  } catch (erreur) {
    console.error("Échec de synchronisation Google Sheets (présences) :", erreur);
  }

  return { succes: true };
}

export async function supprimerEleve(formData: FormData) {
  const classeId = String(formData.get("classeId"));
  const eleveId = String(formData.get("eleveId"));

  const { classe } = await chargerClasseAutorisee(classeId);
  if (!classe) return;

  const { count } = await db.eleve.deleteMany({ where: { id: eleveId, classeId } });
  if (count === 0) return;
  revalidatePath(`/presences/${classeId}`);

  try {
    await synchroniserFeuillePresence(classeId);
  } catch (erreur) {
    console.error("Échec de synchronisation Google Sheets (présences) :", erreur);
  }
}

export async function ajouterSeance(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  const classeId = String(formData.get("classeId"));
  const dateStr = String(formData.get("date") ?? "");
  if (!DATE_ISO.test(dateStr)) return { succes: false, message: "La date est requise." };

  const { classe } = await chargerClasseAutorisee(classeId);
  if (!classe) return { succes: false, message: "Cours introuvable." };

  await db.seance.create({
    data: { classeId, date: new Date(`${dateStr}T00:00:00.000Z`) },
  });
  revalidatePath(`/presences/${classeId}`);
  return { succes: true };
}

export async function modifierDateSeance(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  const classeId = String(formData.get("classeId"));
  const seanceId = String(formData.get("seanceId"));
  const dateStr = String(formData.get("date") ?? "");
  if (!DATE_ISO.test(dateStr)) return { succes: false, message: "La date est requise." };

  const { classe } = await chargerClasseAutorisee(classeId);
  if (!classe) return { succes: false, message: "Cours introuvable." };

  // Horaire et lieu propres à cette date (ensembles) : seulement si le formulaire les propose.
  const exceptions = formData.has("horaire")
    ? {
        horaire: String(formData.get("horaire") ?? "").trim().slice(0, 80) || null,
        lieu: String(formData.get("lieu") ?? "").trim().slice(0, 80) || null,
      }
    : {};
  // La séance doit appartenir au cours autorisé.
  const { count } = await db.seance.updateMany({
    where: { id: seanceId, classeId },
    data: { date: new Date(`${dateStr}T00:00:00.000Z`), ...exceptions },
  });
  if (count === 0) return { succes: false, message: "Séance introuvable." };
  revalidatePath(`/presences/${classeId}`);

  try {
    await synchroniserFeuillePresence(classeId);
  } catch (erreur) {
    console.error("Échec de synchronisation Google Sheets (présences) :", erreur);
  }

  return { succes: true };
}

// Agenda de l'année d'un ensemble : les dates cochées deviennent des séances, les dates
// décochées sont retirées — sauf si l'appel a été fait ou l'absence du prof déclarée.
export async function enregistrerAgenda(_etatPrecedent: EtatAction, formData: FormData): Promise<EtatAction> {
  const classeId = String(formData.get("classeId"));
  const { classe } = await chargerClasseAutorisee(classeId);
  if (!classe) return { succes: false, message: "Cours introuvable." };

  let cochees: string[];
  try {
    const brut: unknown = JSON.parse(String(formData.get("dates") ?? "[]"));
    if (!Array.isArray(brut) || brut.some((d) => typeof d !== "string" || !DATE_ISO.test(d))) throw new Error();
    cochees = brut as string[];
  } catch {
    return { succes: false, message: "Dates illisibles, rechargez la page." };
  }
  if (cochees.length > 200) return { succes: false, message: "Trop de dates." };

  const existantes = await db.seance.findMany({
    where: { classeId },
    select: { id: true, date: true, pointage: { select: { id: true } }, absenceProf: { select: { id: true } } },
  });
  const { ajouts, retraits } = differenceAgenda(
    existantes.map((s) => ({ id: s.id, date: s.date.toISOString().slice(0, 10), verrouillee: !!s.pointage || !!s.absenceProf })),
    cochees
  );
  await db.$transaction([
    db.seance.deleteMany({ where: { id: { in: retraits }, classeId, pointage: { is: null }, absenceProf: { is: null } } }),
    db.seance.createMany({ data: ajouts.map((d) => ({ classeId, date: new Date(`${d}T00:00:00.000Z`) })) }),
  ]);

  revalidatePath(`/presences/${classeId}`);
  revalidatePath(`/presences/${classeId}/agenda`);
  revalidatePath("/presences/ensembles");
  const pl = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
  return {
    succes: true,
    message:
      ajouts.length || retraits.length
        ? `Agenda enregistré : ${pl(ajouts.length, "date")} ajoutée${ajouts.length > 1 ? "s" : ""}, ${pl(retraits.length, "date")} retirée${retraits.length > 1 ? "s" : ""}.`
        : "Agenda enregistré, aucun changement.",
  };
}
