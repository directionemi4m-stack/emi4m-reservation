"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ACCES } from "@/lib/cles";
import { lireSignature } from "@/lib/bulletinsCham";
import { anneeScolaireDebut } from "@/lib/fraisRecap";
import { regenererRegistre } from "@/lib/clesServeur";

export type EtatAction = { succes: boolean; message?: string };

// Registre des clés : réservé à la direction ; c'est son téléphone qui recueille la
// signature du salarié.
async function exigerDirection() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") throw new Error("Accès réservé à la direction.");
  const moi = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true, prenom: true, nom: true } });
  return { id: session.user.id, nom: moi ? `${moi.prenom} ${moi.nom}` : "Direction" };
}

function champ(formData: FormData, nom: string) {
  return String(formData.get(nom) ?? "").trim();
}

function lireDate(formData: FormData): Date | null {
  const d = champ(formData, "date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const date = new Date(`${d}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Le PDF n'est qu'une copie : une erreur Google ne doit pas faire échouer la signature.
async function registre(saisons: number[], responsable: string): Promise<string | undefined> {
  let avertissement: string | undefined;
  for (const s of [...new Set(saisons)]) {
    try {
      if (!(await regenererRegistre(s, responsable))) avertissement = "Enregistré, mais le registre PDF n'a pas pu être déposé dans le Drive.";
    } catch (erreur) {
      console.error("Régénération du registre des clés impossible :", erreur);
      avertissement = "Enregistré, mais le registre PDF n'a pas pu être mis à jour dans le Drive.";
    }
  }
  revalidatePath("/admin/cles");
  return avertissement;
}

export async function remettreCles(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  const direction = await exigerDirection();
  const profId = champ(formData, "profId");
  const date = lireDate(formData);
  const quantites = Object.fromEntries(ACCES.map((a) => [a.champ, Number(formData.get(a.champ) || 0)])) as Record<
    (typeof ACCES)[number]["champ"],
    number
  >;
  const papier = formData.get("papier") === "on";
  const signature = papier ? null : lireSignature(champ(formData, "signature"));

  if (!(await db.user.findUnique({ where: { id: profId }, select: { id: true } }))) return { succes: false, message: "Salarié introuvable." };
  if (!date) return { succes: false, message: "Date invalide." };
  if (Object.values(quantites).some((n) => !Number.isInteger(n) || n < 0 || n > 20)) return { succes: false, message: "Nombre invalide." };
  if (Object.values(quantites).every((n) => n === 0)) return { succes: false, message: "Indiquez au moins une clé ou un badge." };
  if (!papier && !signature) return { succes: false, message: "Le salarié doit signer dans le cadre." };

  await db.remiseCles.create({
    data: {
      profId,
      ...quantites,
      remiseLe: date,
      signatureRemise: signature ? new Uint8Array(signature) : null,
      remiseParId: direction.id,
      commentaire: champ(formData, "commentaire").slice(0, 300) || null,
    },
  });
  const avertissement = await registre([anneeScolaireDebut(date)], direction.nom);
  return { succes: true, message: avertissement ?? "Remise signée et registre mis à jour." };
}

// Restitution signée une fois pour toutes les remises cochées.
export async function restituerCles(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  const direction = await exigerDirection();
  const ids = formData.getAll("remiseIds").map(String).filter(Boolean);
  const date = lireDate(formData);
  const papier = formData.get("papier") === "on";
  const signature = papier ? null : lireSignature(champ(formData, "signature"));

  if (ids.length === 0) return { succes: false, message: "Cochez ce qui est rendu." };
  if (!date) return { succes: false, message: "Date invalide." };
  if (!papier && !signature) return { succes: false, message: "Le salarié doit signer dans le cadre." };

  const remises = await db.remiseCles.findMany({ where: { id: { in: ids }, restitueLe: null } });
  if (remises.length !== ids.length) return { succes: false, message: "Une de ces remises est déjà restituée." };
  if (remises.some((r) => r.remiseLe > date)) return { succes: false, message: "La restitution ne peut pas précéder la remise." };

  await db.remiseCles.updateMany({
    where: { id: { in: ids } },
    data: {
      restitueLe: date,
      signatureRestitution: signature ? new Uint8Array(signature) : null,
      restitutionPapier: papier,
      restitueParId: direction.id,
    },
  });
  const saisons = [...remises.map((r) => anneeScolaireDebut(r.remiseLe)), anneeScolaireDebut(date)];
  const avertissement = await registre(saisons, direction.nom);
  return { succes: true, message: avertissement ?? "Restitution signée et registre mis à jour." };
}

// Pour une erreur de saisie seulement.
export async function supprimerRemise(formData: FormData) {
  const direction = await exigerDirection();
  const remise = await db.remiseCles.findUnique({ where: { id: champ(formData, "id") } });
  if (!remise) return;
  await db.remiseCles.delete({ where: { id: remise.id } });
  await registre(
    [anneeScolaireDebut(remise.remiseLe), ...(remise.restitueLe ? [anneeScolaireDebut(remise.restitueLe)] : [])],
    direction.nom
  );
}

export async function mettreAJourRegistre(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  const direction = await exigerDirection();
  const anneeDebut = Number(formData.get("anneeDebut"));
  if (!Number.isInteger(anneeDebut)) return { succes: false, message: "Saison invalide." };
  const avertissement = await registre([anneeDebut], direction.nom);
  return avertissement ? { succes: false, message: avertissement.replace("Enregistré, mais le", "Le") } : { succes: true, message: "Registre mis à jour." };
}
