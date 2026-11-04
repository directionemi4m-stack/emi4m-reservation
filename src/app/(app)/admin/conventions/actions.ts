"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deposerConvention, estJetonRevoqueOuExpire } from "@/lib/drive";
import { photosEnPdf } from "@/lib/photoEnPdf";
import { contenuCorrespond } from "@/lib/typeFichier";
import { COMMENTAIRE_MAX, lireDate, nomFichierConvention, saisonDe } from "@/lib/conventions";
import { assurerConvention, regenererRegistreConventions, regenererRegistreSansErreur } from "@/lib/conventionsServeur";

export type EtatAction = { succes: boolean; message?: string };

const TAILLE_MAX = 10 * 1024 * 1024;

async function exigerAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") throw new Error("Accès réservé à la direction.");
}

function revalider() {
  revalidatePath("/admin/conventions");
  revalidatePath("/admin/demandes");
}

// Dates de demande et de réponse de la mairie, commentaire, et scan de la convention
// signée (un PDF, ou des photos assemblées en PDF), archivé dans le Drive.
export async function enregistrerConvention(formData: FormData): Promise<EtatAction> {
  await exigerAdmin();
  const conventionId = String(formData.get("conventionId") ?? "");
  const demandeCreneauId = String(formData.get("demandeCreneauId") ?? "");

  const demandeMairieLe = lireDate(formData.get("demandeMairieLe"));
  const reponseMairieLe = lireDate(formData.get("reponseMairieLe"));
  if (demandeMairieLe === undefined || reponseMairieLe === undefined) return { succes: false, message: "Date invalide." };
  if (demandeMairieLe && reponseMairieLe && reponseMairieLe < demandeMairieLe) {
    return { succes: false, message: "La réponse de la mairie ne peut pas précéder la demande." };
  }
  const commentaire = String(formData.get("commentaire") ?? "").trim().slice(0, COMMENTAIRE_MAX) || null;

  const convention = conventionId
    ? await db.conventionSalle.findUnique({ where: { id: conventionId } })
    : demandeCreneauId
      ? await assurerConvention(demandeCreneauId)
      : null;
  if (!convention) return { succes: false, message: "Réservation introuvable, ou salle sans convention." };

  const fichiers = await Promise.all(
    formData
      .getAll("fichiers")
      .filter((f): f is File => f instanceof File && f.size > 0)
      .map(async (f) => ({ type: f.type, octets: new Uint8Array(await f.arrayBuffer()) }))
  );
  let fichier: { fichierDriveId: string; fichierUrl: string; nomFichier: string } | null = null;
  if (fichiers.length > 0) {
    if (fichiers.reduce((s, f) => s + f.octets.length, 0) > TAILLE_MAX) return { succes: false, message: "Fichiers trop lourds (10 Mo au total)." };
    let pdf: Buffer;
    if (fichiers.length === 1 && contenuCorrespond(fichiers[0].octets, "application/pdf")) pdf = Buffer.from(fichiers[0].octets);
    else if (fichiers.every((f) => contenuCorrespond(f.octets, "image/jpeg"))) pdf = Buffer.from(await photosEnPdf(fichiers.map((f) => f.octets)));
    else return { succes: false, message: "Envoyez un PDF, ou des photos." };

    const nomFichier = nomFichierConvention(convention);
    try {
      const depose = await deposerConvention({
        saison: saisonDe(convention.date),
        nomFichier,
        pdf,
        fichierExistantId: convention.fichierDriveId,
      });
      if (!depose) return { succes: false, message: "Envoi vers Google Drive indisponible." };
      fichier = { fichierDriveId: depose.id, fichierUrl: depose.url, nomFichier };
    } catch (erreur) {
      console.error("Archivage de la convention impossible :", erreur);
      return {
        succes: false,
        message: estJetonRevoqueOuExpire(erreur)
          ? "La connexion à Google Drive a expiré : reconnectez-la dans Paramètres."
          : "L'envoi a échoué. Réessayez dans quelques instants.",
      };
    }
  }

  await db.conventionSalle.update({
    where: { id: convention.id },
    data: { demandeMairieLe, reponseMairieLe, commentaire, ...(fichier ?? {}) },
  });
  after(regenererRegistreSansErreur);
  revalider();
  return { succes: true, message: fichier ? "Convention archivée dans le Drive." : "Enregistré." };
}

// Réécrit le registre du Drive à la demande (ex. après l'avoir modifié à la main).
export async function mettreAJourRegistre(): Promise<EtatAction> {
  await exigerAdmin();
  try {
    const r = await regenererRegistreConventions();
    if (!r) return { succes: false, message: "Google Drive n'est pas connecté." };
  } catch (erreur) {
    console.error("Registre des conventions non mis à jour :", erreur);
    return {
      succes: false,
      message: estJetonRevoqueOuExpire(erreur)
        ? "La connexion à Google Drive a expiré : reconnectez-la dans Paramètres."
        : "La mise à jour du registre a échoué.",
    };
  }
  revalider();
  return { succes: true, message: "Registre mis à jour." };
}
