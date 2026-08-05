"use server";

import { revalidatePath } from "next/cache";
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

export async function ajouterCreneauRecurrent(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();

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
    return { succes: false, message: "Merci de remplir tous les champs obligatoires." };
  }
  if (heureDebut >= heureFin) {
    return { succes: false, message: "L'heure de fin doit être après l'heure de début." };
  }

  const dateDebut = new Date(`${dateDebutStr}T00:00:00.000Z`);
  const dateFin = dateFinStr ? new Date(`${dateFinStr}T00:00:00.000Z`) : null;
  if (dateFin && dateFin < dateDebut) {
    return { succes: false, message: "La date de fin doit être après la date de début." };
  }

  const resultat = await verifierConflitRecurrent({
    salleId,
    jourSemaine,
    heureDebut,
    heureFin,
    dateDebut,
    dateFin,
  });
  if (!resultat.disponible) {
    return { succes: false, message: `Conflit : ${resultat.creneauBloquant}` };
  }

  await db.creneauRecurrent.create({
    data: {
      profId,
      salleId,
      jourSemaine,
      heureDebut: new Date(`1970-01-01T${heureDebut}:00.000Z`),
      heureFin: new Date(`1970-01-01T${heureFin}:00.000Z`),
      dateDebut,
      dateFin,
    },
  });

  revalidatePath("/admin/parametres/creneaux-recurrents");
  revalidatePath("/planning");

  return { succes: true, message: "Créneau récurrent ajouté." };
}

export async function desactiverCreneauRecurrent(formData: FormData) {
  await exigerAdmin();

  const id = String(formData.get("id"));
  await db.creneauRecurrent.update({ where: { id }, data: { actif: false } });

  revalidatePath("/admin/parametres/creneaux-recurrents");
  revalidatePath("/planning");
}
