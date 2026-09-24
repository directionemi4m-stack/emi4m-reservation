"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifierConflitRecurrent } from "@/lib/conflicts";
import type { JourSemaine } from "@/generated/prisma/client";

export type EtatAction = { succes: boolean; message?: string };

async function exigerAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    throw new Error("Accès réservé à la direction.");
  }
}

const JOURS_VALIDES: JourSemaine[] = [
  "LUNDI",
  "MARDI",
  "MERCREDI",
  "JEUDI",
  "VENDREDI",
  "SAMEDI",
  "DIMANCHE",
];

interface ChampsCreneau {
  profId: string;
  salleId: string;
  jourSemaine: JourSemaine;
  heureDebut: string;
  heureFin: string;
  dateDebut: Date;
  dateFin: Date | null;
}

// Lecture et contrôle du formulaire, communs à l'ajout et à la modification.
function lireChamps(formData: FormData): { erreur: string } | { champs: ChampsCreneau } {
  const profId = String(formData.get("profId") ?? "");
  const salleId = String(formData.get("salleId") ?? "");
  const jourSemaine = String(formData.get("jourSemaine") ?? "") as JourSemaine;
  const heureDebut = String(formData.get("heureDebut") ?? "");
  const heureFin = String(formData.get("heureFin") ?? "");
  const dateDebutStr = String(formData.get("dateDebut") ?? "");
  const dateFinStr = String(formData.get("dateFin") ?? "").trim();

  if (
    !profId ||
    !salleId ||
    !JOURS_VALIDES.includes(jourSemaine) ||
    !heureDebut ||
    !heureFin ||
    !dateDebutStr
  ) {
    return { erreur: "Merci de remplir tous les champs obligatoires." };
  }
  if (heureDebut >= heureFin) {
    return { erreur: "L'heure de fin doit être après l'heure de début." };
  }

  const dateDebut = new Date(`${dateDebutStr}T00:00:00.000Z`);
  const dateFin = dateFinStr ? new Date(`${dateFinStr}T00:00:00.000Z`) : null;
  if (dateFin && dateFin < dateDebut) {
    return { erreur: "La date de fin doit être après la date de début." };
  }

  return { champs: { profId, salleId, jourSemaine, heureDebut, heureFin, dateDebut, dateFin } };
}

function donneesPrisma(c: ChampsCreneau) {
  return {
    profId: c.profId,
    salleId: c.salleId,
    jourSemaine: c.jourSemaine,
    heureDebut: new Date(`1970-01-01T${c.heureDebut}:00.000Z`),
    heureFin: new Date(`1970-01-01T${c.heureFin}:00.000Z`),
    dateDebut: c.dateDebut,
    dateFin: c.dateFin,
  };
}

export async function ajouterCreneauRecurrent(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();

  const lu = lireChamps(formData);
  if ("erreur" in lu) return { succes: false, message: lu.erreur };

  const resultat = await verifierConflitRecurrent(lu.champs);
  if (!resultat.disponible) {
    return { succes: false, message: `Conflit : ${resultat.creneauBloquant}` };
  }

  await db.creneauRecurrent.create({ data: donneesPrisma(lu.champs) });

  revalidatePath("/admin/parametres/creneaux-recurrents");
  revalidatePath("/planning");

  return { succes: true, message: "Créneau récurrent ajouté." };
}

// Modifie un créneau récurrent en place (prof, salle, jour, horaires, période) — le
// conflit est recalculé sans tenir compte du créneau lui-même.
export async function modifierCreneauRecurrent(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();

  const id = String(formData.get("id") ?? "");
  const existant = await db.creneauRecurrent.findUnique({ where: { id } });
  if (!existant || !existant.actif) {
    return { succes: false, message: "Ce créneau n'existe plus." };
  }

  const lu = lireChamps(formData);
  if ("erreur" in lu) return { succes: false, message: lu.erreur };

  const resultat = await verifierConflitRecurrent(lu.champs, { excludeId: id });
  if (!resultat.disponible) {
    return { succes: false, message: `Conflit : ${resultat.creneauBloquant}` };
  }

  await db.creneauRecurrent.update({ where: { id }, data: donneesPrisma(lu.champs) });

  revalidatePath("/planning");
  revalidatePath("/admin/parametres/creneaux-recurrents");
  // Repart sur la page sans « ?modifier= » : l'éditeur se referme, la ligne est à jour.
  redirect(`/admin/parametres/creneaux-recurrents#creneau-${id}`);
}

export async function desactiverCreneauRecurrent(formData: FormData) {
  await exigerAdmin();

  const id = String(formData.get("id"));
  await db.creneauRecurrent.update({ where: { id }, data: { actif: false } });

  revalidatePath("/admin/parametres/creneaux-recurrents");
  revalidatePath("/planning");
}
