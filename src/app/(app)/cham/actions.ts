"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AUTORISATIONS, AUTORISATIONS_INTERCOURS } from "@/lib/cham";
import {
  alerterConnexionDriveInterrompue,
  estJetonRevoqueOuExpire,
  supprimerDocumentCham,
  televerserDocumentCham,
} from "@/lib/drive";
import { urlBase } from "@/lib/url";
import type { AutorisationIntercours, AutorisationSortie } from "@/generated/prisma/client";

export type EtatAction = { succes: boolean; message?: string };

// Toute modification de la liste CHAM est réservée à la direction — vérifié ici, côté
// serveur : masquer les boutons ne suffirait pas.
async function exigerAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    throw new Error("Accès réservé à la direction.");
  }
}

function texteOuNull(formData: FormData, nom: string) {
  return String(formData.get(nom) ?? "").trim() || null;
}

interface ChampsEleve {
  prenom: string;
  nom: string;
  age: number | null;
  telephone: string | null;
  email: string | null;
  ville: string | null;
}

function lireChampsEleve(formData: FormData): { erreur: string } | { champs: ChampsEleve } {
  const prenom = String(formData.get("prenom") ?? "").trim();
  const nom = String(formData.get("nom") ?? "").trim();
  if (!prenom || !nom) return { erreur: "Le prénom et le nom sont obligatoires." };

  const ageBrut = String(formData.get("age") ?? "").trim();
  let age: number | null = null;
  if (ageBrut) {
    age = Number(ageBrut);
    if (!Number.isInteger(age) || age < 3 || age > 25) return { erreur: "Âge invalide." };
  }

  const email = texteOuNull(formData, "email")?.toLowerCase() ?? null;
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { erreur: "Adresse e-mail invalide." };

  return {
    champs: {
      prenom,
      nom,
      age,
      telephone: texteOuNull(formData, "telephone"),
      email,
      ville: texteOuNull(formData, "ville"),
    },
  };
}

export async function ajouterEleveCham(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();

  const lu = lireChampsEleve(formData);
  if ("erreur" in lu) return { succes: false, message: lu.erreur };

  await db.eleveCham.create({ data: lu.champs });
  revalidatePath("/cham");
  return { succes: true, message: `${lu.champs.prenom} ${lu.champs.nom} ajouté(e).` };
}

export async function modifierEleveCham(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();

  const id = String(formData.get("id") ?? "");
  const lu = lireChampsEleve(formData);
  if ("erreur" in lu) return { succes: false, message: lu.erreur };

  const existant = await db.eleveCham.findUnique({ where: { id }, select: { id: true } });
  if (!existant) return { succes: false, message: "Cet élève n'existe plus." };

  await db.eleveCham.update({ where: { id }, data: lu.champs });
  revalidatePath("/cham");
  return { succes: true, message: "Modifications enregistrées." };
}

export async function enregistrerSortieCham(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();

  const id = String(formData.get("id") ?? "");
  const autorisationIntercours = String(formData.get("autorisationIntercours") ?? "") as AutorisationIntercours;
  const autorisationSortie16h30 = String(formData.get("autorisationSortie16h30") ?? "") as AutorisationSortie;
  const precisionsSortie = texteOuNull(formData, "precisionsSortie");

  if (!AUTORISATIONS_INTERCOURS.includes(autorisationIntercours) || !AUTORISATIONS.includes(autorisationSortie16h30)) {
    return { succes: false, message: "Valeur invalide." };
  }
  if (precisionsSortie && precisionsSortie.length > 300) {
    return { succes: false, message: "Précisions trop longues (300 caractères max)." };
  }

  const existant = await db.eleveCham.findUnique({ where: { id }, select: { id: true } });
  if (!existant) return { succes: false, message: "Cet élève n'existe plus." };

  await db.eleveCham.update({
    where: { id },
    data: { autorisationIntercours, autorisationSortie16h30, precisionsSortie },
  });
  revalidatePath("/cham");
  return { succes: true, message: "Enregistré" };
}

// Photo (prise au téléphone) ou PDF de la fiche signée par les parents.
const TYPES_FICHE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "application/pdf": ".pdf",
};
const TAILLE_MAX_FICHE = 10 * 1024 * 1024;

export async function televerserFicheCham(_etatPrecedent: EtatAction, formData: FormData): Promise<EtatAction> {
  await exigerAdmin();

  const id = String(formData.get("id") ?? "");
  const fichier = formData.get("fiche");
  if (!(fichier instanceof File) || fichier.size === 0) return { succes: false, message: "Aucun fichier reçu." };
  const extension = TYPES_FICHE[fichier.type];
  if (!extension) return { succes: false, message: "Format non accepté (photo ou PDF uniquement)." };
  if (fichier.size > TAILLE_MAX_FICHE) return { succes: false, message: "Fichier trop volumineux (10 Mo max)." };

  try {
    const eleve = await televerserDocumentCham(id, Buffer.from(await fichier.arrayBuffer()), fichier.type, extension);
    if (!eleve) return { succes: false, message: "Envoi vers Google Drive indisponible." };
  } catch (erreur) {
    console.error("Envoi de la fiche CHAM vers Google Drive impossible :", erreur);
    if (estJetonRevoqueOuExpire(erreur)) {
      try {
        await alerterConnexionDriveInterrompue("expiree", `${await urlBase()}/admin/parametres/google-drive`);
      } catch (erreurAlerte) {
        console.error("Alerte connexion Drive non envoyée :", erreurAlerte);
      }
      return { succes: false, message: "La connexion à Google Drive a expiré : reconnectez-la dans Paramètres." };
    }
    return { succes: false, message: "L'envoi a échoué. Réessayez dans quelques instants." };
  }

  revalidatePath("/cham");
  return { succes: true, message: "Fiche enregistrée" };
}

export async function retirerFicheCham(_etatPrecedent: EtatAction, formData: FormData): Promise<EtatAction> {
  await exigerAdmin();
  await supprimerDocumentCham(String(formData.get("id") ?? ""));
  revalidatePath("/cham");
  return { succes: true };
}

export async function supprimerEleveCham(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();

  const id = String(formData.get("id") ?? "");
  // La fiche scannée part avec l'élève (elle n'a plus de raison d'être conservée).
  await supprimerDocumentCham(id);
  await db.eleveCham.deleteMany({ where: { id } });
  revalidatePath("/cham");
  return { succes: true };
}
