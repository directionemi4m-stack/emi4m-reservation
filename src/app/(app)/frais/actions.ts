"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { synchroniserFraisProf } from "@/lib/sheets";
import { televerserDocumentProf, supprimerDocumentProf } from "@/lib/drive";
import type { TypeMission, TypeDocument } from "@/generated/prisma/client";

export type EtatAction = { succes: boolean; message?: string };

const TYPES_MISSION: TypeMission[] = ["COURS", "CONCERT", "REUNION", "AUTRE"];
const TYPES_DOCUMENT: TypeDocument[] = ["PERMIS_CONDUIRE", "CARTE_IDENTITE"];
const TYPES_MIME_AUTORISES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};
const TAILLE_MAX_OCTETS = 10 * 1024 * 1024;

export async function ajouterTrajet(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  const session = await auth();
  if (!session?.user) return { succes: false, message: "Non connecté." };

  const dateStr = String(formData.get("date") ?? "");
  const typeMission = String(formData.get("typeMission") ?? "") as TypeMission;
  const precisionMission = String(formData.get("precisionMission") ?? "").trim() || null;
  const typeTrajetId = String(formData.get("typeTrajetId") ?? "");

  if (!dateStr) return { succes: false, message: "La date est requise." };
  if (!TYPES_MISSION.includes(typeMission)) {
    return { succes: false, message: "Le type de mission est requis." };
  }
  if (typeMission === "AUTRE" && !precisionMission) {
    return { succes: false, message: "Merci de préciser la mission." };
  }

  const typeTrajet = await db.typeTrajet.findUnique({ where: { id: typeTrajetId } });
  if (!typeTrajet) return { succes: false, message: "Trajet introuvable." };

  await db.trajet.create({
    data: {
      profId: session.user.id,
      date: new Date(`${dateStr}T00:00:00.000Z`),
      typeMission,
      precisionMission,
      typeTrajetId: typeTrajet.id,
      trajetNom: typeTrajet.nom,
      km: typeTrajet.km,
      prix: typeTrajet.prix,
    },
  });

  revalidatePath("/frais");

  try {
    await synchroniserFraisProf(session.user.id);
  } catch (erreur) {
    console.error("Échec de synchronisation Google Sheets (frais) :", erreur);
  }

  return { succes: true };
}

export async function supprimerTrajet(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  const session = await auth();
  if (!session?.user) return { succes: false, message: "Non connecté." };

  const id = String(formData.get("id"));
  const trajet = await db.trajet.findUnique({ where: { id } });
  if (!trajet) return { succes: false, message: "Ce trajet n'existe plus." };
  if (trajet.profId !== session.user.id && session.user.role !== "ADMIN") {
    return { succes: false, message: "Action non autorisée." };
  }

  await db.trajet.delete({ where: { id } });
  revalidatePath("/frais");

  try {
    await synchroniserFraisProf(trajet.profId);
  } catch (erreur) {
    console.error("Échec de synchronisation Google Sheets (frais) :", erreur);
  }

  return { succes: true };
}

function champTexte(formData: FormData, nom: string) {
  return String(formData.get(nom) ?? "").trim() || null;
}

export async function enregistrerIdentite(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  const session = await auth();
  if (!session?.user) return { succes: false, message: "Non connecté." };

  const donnees = {
    adresseDomicile: champTexte(formData, "adresseDomicile"),
    numeroPermis: champTexte(formData, "numeroPermis"),
    numeroCarteGrise: champTexte(formData, "numeroCarteGrise"),
    numeroAssuranceAuto: champTexte(formData, "numeroAssuranceAuto"),
    immatriculationVehicule: champTexte(formData, "immatriculationVehicule"),
    marqueModeleVehicule: champTexte(formData, "marqueModeleVehicule"),
    puissanceFiscale: champTexte(formData, "puissanceFiscale"),
  };

  await db.identiteProf.upsert({
    where: { profId: session.user.id },
    create: { profId: session.user.id, ...donnees },
    update: donnees,
  });

  revalidatePath("/frais/identite");

  try {
    await synchroniserFraisProf(session.user.id);
  } catch (erreur) {
    console.error("Échec de synchronisation Google Sheets (frais) :", erreur);
  }

  return { succes: true, message: "Fiche identité enregistrée." };
}

export async function televerserDocument(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  const session = await auth();
  if (!session?.user) return { succes: false, message: "Non connecté." };

  const type = String(formData.get("type") ?? "") as TypeDocument;
  if (!TYPES_DOCUMENT.includes(type)) {
    return { succes: false, message: "Type de document invalide." };
  }

  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { succes: false, message: "Merci de choisir un fichier." };
  }
  const extension = TYPES_MIME_AUTORISES[fichier.type];
  if (!extension) {
    return { succes: false, message: "Format non accepté (photo ou PDF uniquement)." };
  }
  if (fichier.size > TAILLE_MAX_OCTETS) {
    return { succes: false, message: "Fichier trop volumineux (10 Mo max)." };
  }

  const buffer = Buffer.from(await fichier.arrayBuffer());
  const document = await televerserDocumentProf(session.user.id, type, buffer, fichier.type, extension);
  if (!document) {
    return { succes: false, message: "Synchronisation Google Drive indisponible." };
  }

  revalidatePath("/frais/identite");
  return { succes: true, message: "Document envoyé." };
}

export async function supprimerDocument(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  const session = await auth();
  if (!session?.user) return { succes: false, message: "Non connecté." };

  const type = String(formData.get("type") ?? "") as TypeDocument;
  if (!TYPES_DOCUMENT.includes(type)) {
    return { succes: false, message: "Type de document invalide." };
  }

  await supprimerDocumentProf(session.user.id, type);
  revalidatePath("/frais/identite");
  return { succes: true };
}
