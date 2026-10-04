"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { genererDatesSeances, premiereOccurrence } from "@/lib/presences";
import { supprimerFeuillePresence, synchroniserFeuillePresence } from "@/lib/sheets";
import type { JourSemaine } from "@/generated/prisma/client";

const JOURS_SEMAINE: JourSemaine[] = [
  "LUNDI",
  "MARDI",
  "MERCREDI",
  "JEUDI",
  "VENDREDI",
  "SAMEDI",
  "DIMANCHE",
];

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
  const jourSemaine = String(formData.get("jourSemaine") ?? "") as JourSemaine;
  const apartirDeStr = String(formData.get("dateDebut") ?? "");
  const emoji = String(formData.get("emoji") ?? "🎼");
  const disciplineId = String(formData.get("disciplineId") ?? "");

  if (!apartirDeStr) {
    return { succes: false, message: "La date de rentrée est requise." };
  }
  if (!JOURS_SEMAINE.includes(jourSemaine)) {
    return { succes: false, message: "Le jour de la semaine est requis." };
  }
  // La 1ère séance n'est pas forcément le jour choisi : on cherche la première
  // occurrence de ce jour à partir de la date saisie (jamais l'inverse).
  const dateDebut = premiereOccurrence(jourSemaine, new Date(`${apartirDeStr}T00:00:00.000Z`));

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

  const vacances = await db.periodeVacances.findMany();
  const dates = genererDatesSeances(dateDebut, vacances);

  const classe = await db.classe.create({
    data: {
      profId: session.user.id,
      type,
      nom,
      emoji,
      jour,
      jourSemaine,
      lieuId: type === "FM" ? lieuId : null,
      niveauFMId: type === "FM" ? niveauFMId : null,
      dateDebut,
      seances: { create: dates.map((date) => ({ date })) },
    },
  });

  revalidatePath("/presences");
  redirect(`/presences/${classe.id}`);
}

// Modifie la discipline et/ou le jour/horaire d'un cours déjà créé (élèves, séances et
// présences existantes restent inchangés). Si la discipline change et que le cours
// quittait un onglet partagé, celui-ci est resynchronisé (ou supprimé s'il n'en reste
// plus aucun groupe), exactement comme à la suppression. Le jour est aussi resynchronisé
// dans tous les cas : il détermine l'ordre des groupes et le libellé affiché dans le
// classeur (cf. lib/sheets), même quand la discipline ne change pas.
export async function modifierCoursDetails(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  const session = await exigerConnecte();
  const id = String(formData.get("id") ?? "");
  const disciplineId = String(formData.get("disciplineId") ?? "");
  const jour = String(formData.get("jour") ?? "").trim() || null;
  const jourSemaine = String(formData.get("jourSemaine") ?? "") as JourSemaine;
  if (!JOURS_SEMAINE.includes(jourSemaine)) {
    return { succes: false, message: "Le jour de la semaine est requis." };
  }

  const classeAvant = await db.classe.findUnique({ where: { id } });
  if (!classeAvant) {
    return { succes: false, message: "Ce cours n'existe plus." };
  }
  if (classeAvant.profId !== session.user.id && session.user.role !== "ADMIN") {
    return { succes: false, message: "Vous ne pouvez pas modifier ce cours." };
  }

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
    lieuId = String(formData.get("lieuId") ?? "") || null;

    if (!niveauFMId) {
      return { succes: false, message: "Le niveau FM est requis." };
    }
    const niveau = await db.niveauFM.findUnique({ where: { id: niveauFMId } });
    if (!niveau) {
      return { succes: false, message: "Niveau FM introuvable." };
    }
    nom = /^fm/i.test(niveau.nom) ? niveau.nom : `FM ${niveau.nom}`;
  }

  const disciplineChangee = nom !== classeAvant.nom || type !== classeAvant.type;
  const jourChange = jour !== classeAvant.jour || jourSemaine !== classeAvant.jourSemaine;
  if (!disciplineChangee && !jourChange) {
    return { succes: true, message: "Aucune modification." };
  }

  // Ne touche jamais aux séances déjà créées : changer le jour de la semaine ici ne
  // sert qu'à corriger le libellé/tri affiché, pas à redéplacer des séances existantes
  // (cf. le script de correction manuel pour ce cas, qui demande une vraie décision).
  await db.classe.update({
    where: { id },
    data: {
      type,
      nom,
      jour,
      jourSemaine,
      lieuId: type === "FM" ? lieuId : null,
      niveauFMId: type === "FM" ? niveauFMId : null,
    },
  });

  revalidatePath(`/presences/${id}`);
  revalidatePath("/presences");

  try {
    if (disciplineChangee) {
      // Onglet quitté : le resynchroniser à partir d'un groupe restant, ou le
      // supprimer s'il n'en reste plus aucun.
      const groupeRestant = await db.classe.findFirst({
        where: { nom: classeAvant.nom, type: classeAvant.type, actif: true },
        select: { id: true },
      });
      if (groupeRestant) {
        await synchroniserFeuillePresence(groupeRestant.id);
      } else {
        await supprimerFeuillePresence(classeAvant);
      }
    }
    // Onglet actuel (rejoint si la discipline a changé, ou simplement mis à jour si
    // seul le jour a changé) : toujours resynchronisé en dernier.
    await synchroniserFeuillePresence(id);
  } catch (erreur) {
    console.error("Échec de mise à jour de l'onglet Google Sheets :", erreur);
  }

  return {
    succes: true,
    message: disciplineChangee ? `Discipline changée pour « ${nom} ».` : "Modifications enregistrées.",
  };
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
    // Un même onglet peut être partagé par plusieurs groupes de la même discipline
    // (cf. lib/sheets) : on ne le supprime que si ce cours en était le dernier.
    const groupeRestant = await db.classe.findFirst({
      where: { nom: classe.nom, type: classe.type, actif: true },
      select: { id: true },
    });
    if (groupeRestant) {
      await synchroniserFeuillePresence(groupeRestant.id);
    } else {
      await supprimerFeuillePresence(classe);
    }
  } catch (erreur) {
    console.error("Échec de mise à jour de l'onglet Google Sheets :", erreur);
  }

  return { succes: true };
}
