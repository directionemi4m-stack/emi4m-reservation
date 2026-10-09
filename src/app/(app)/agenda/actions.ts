"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { synchroniserEmploiDuTempsProf } from "@/lib/sheets";
import {
  chevauchement,
  DUREES_COLLECTIF,
  DUREES_INDIVIDUEL,
  HEURE_MAX,
  HEURE_MIN,
  heureVersMinutes,
  minutesVersHeure,
} from "@/lib/agenda";
import type { JourSemaine, TypeCreneauAgenda } from "@/generated/prisma/client";

export type EtatAction = { succes: boolean; message?: string };

const JOURS: JourSemaine[] = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI", "DIMANCHE"];
const TYPES: TypeCreneauAgenda[] = ["INDIVIDUEL", "COLLECTIF"];

async function synchroniser(profId: string) {
  try {
    await synchroniserEmploiDuTempsProf(profId);
  } catch (erreur) {
    console.error("Échec de synchronisation Google Sheets (emplois du temps) :", erreur);
  }
}

export async function ajouterCreneau(_etatPrecedent: EtatAction, formData: FormData): Promise<EtatAction> {
  const session = await auth();
  if (!session?.user) return { succes: false, message: "Non connecté." };

  // Un admin peut remplir l'emploi du temps d'un collègue ; un prof seulement le sien.
  const profIdSaisi = String(formData.get("profId") ?? "");
  const profId = session.user.role === "ADMIN" && profIdSaisi ? profIdSaisi : session.user.id;

  const jourSemaine = String(formData.get("jourSemaine") ?? "") as JourSemaine;
  const type = String(formData.get("type") ?? "") as TypeCreneauAgenda;
  const heureDebutMinutes = heureVersMinutes(String(formData.get("heureDebut") ?? ""));
  const dureeMinutes = Number(formData.get("dureeMinutes"));
  const nom = String(formData.get("nom") ?? "").trim();
  const lieuId = String(formData.get("lieuId") ?? "") || null;
  const uneSemaineSurDeux = formData.get("uneSemaineSurDeux") === "on";

  if (!JOURS.includes(jourSemaine)) return { succes: false, message: "Le jour est requis." };
  if (!TYPES.includes(type)) return { succes: false, message: "Le type de cours est requis." };
  if (heureDebutMinutes === null || heureDebutMinutes < HEURE_MIN || heureDebutMinutes >= HEURE_MAX) {
    return { succes: false, message: "Heure de début invalide (entre 6h et 23h)." };
  }
  const durees: readonly number[] = type === "INDIVIDUEL" ? DUREES_INDIVIDUEL : DUREES_COLLECTIF;
  if (!durees.includes(dureeMinutes)) return { succes: false, message: "Durée invalide." };
  if (!nom) {
    return { succes: false, message: type === "INDIVIDUEL" ? "Le nom de l'élève est requis." : "Le nom du groupe est requis." };
  }
  if (nom.length > 100) return { succes: false, message: "Nom trop long." };
  if (lieuId && !(await db.lieuPresence.findUnique({ where: { id: lieuId } }))) {
    return { succes: false, message: "Lieu introuvable." };
  }
  if (profId !== session.user.id && !(await db.user.findUnique({ where: { id: profId } }))) {
    return { succes: false, message: "Prof introuvable." };
  }

  const nouveau = { jourSemaine, heureDebutMinutes, dureeMinutes, uneSemaineSurDeux };
  const existants = await db.creneauAgenda.findMany({ where: { profId, jourSemaine } });
  const conflit = existants.find((c) => chevauchement(c, nouveau));
  if (conflit) {
    return {
      succes: false,
      message: `Ce créneau chevauche « ${conflit.nom} » (${minutesVersHeure(conflit.heureDebutMinutes)}–${minutesVersHeure(
        conflit.heureDebutMinutes + conflit.dureeMinutes
      )}). Deux élèves ne peuvent partager un créneau que s'ils viennent tous deux une semaine sur deux.`,
    };
  }

  await db.creneauAgenda.create({
    data: { profId, jourSemaine, heureDebutMinutes, dureeMinutes, type, nom, lieuId, uneSemaineSurDeux },
  });

  revalidatePath("/agenda");
  await synchroniser(profId);
  return { succes: true };
}

export async function supprimerCreneau(_etatPrecedent: EtatAction, formData: FormData): Promise<EtatAction> {
  const session = await auth();
  if (!session?.user) return { succes: false, message: "Non connecté." };

  const id = String(formData.get("id"));
  const creneau = await db.creneauAgenda.findUnique({ where: { id } });
  if (!creneau) return { succes: false, message: "Ce créneau n'existe plus." };
  if (creneau.profId !== session.user.id && session.user.role !== "ADMIN") {
    return { succes: false, message: "Action non autorisée." };
  }

  await db.creneauAgenda.delete({ where: { id } });
  revalidatePath("/agenda");
  await synchroniser(creneau.profId);
  return { succes: true };
}
