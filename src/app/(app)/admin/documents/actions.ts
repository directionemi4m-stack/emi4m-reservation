"use server";

import { revalidatePath } from "next/cache";
import { PDFDocument } from "pdf-lib";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { urlBase } from "@/lib/url";
import { ATTESTATION_DEFAUT, ATTESTATION_MAX, estPdf, TAILLE_MAX_PDF, TITRE_MAX } from "@/lib/documentsSignes";
import { mettreAJourDriveDocument, prevenirSignataires, regenererRegistreDocument } from "@/lib/documentsSignesServeur";

export type EtatAction = { succes: boolean; message?: string };

async function exigerDirection() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") throw new Error("Accès réservé à la direction.");
}

const champ = (formData: FormData, nom: string) => String(formData.get(nom) ?? "").trim();

function rafraichir() {
  revalidatePath("/admin/documents");
  revalidatePath("/securite");
  revalidatePath("/accueil");
}

// Le PDF déposé : vérifié (vrai PDF, lisible, taille raisonnable) avant toute publication.
async function lirePdf(formData: FormData): Promise<{ erreur: string } | { pdf: Uint8Array<ArrayBuffer>; nomFichier: string }> {
  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) return { erreur: "Choisissez le PDF du document." };
  if (fichier.size > TAILLE_MAX_PDF) return { erreur: "PDF trop lourd (10 Mo maximum)." };
  const pdf = new Uint8Array(await fichier.arrayBuffer());
  if (!estPdf(pdf)) return { erreur: "Ce fichier n'est pas un PDF." };
  try {
    await PDFDocument.load(pdf, { ignoreEncryption: true });
  } catch {
    return { erreur: "Ce PDF est illisible ou protégé : exportez-le à nouveau puis réessayez." };
  }
  return { pdf, nomFichier: fichier.name.slice(0, 200) || "document.pdf" };
}

function lireTextes(formData: FormData): { erreur: string } | { titre: string; attestation: string } {
  const titre = champ(formData, "titre").slice(0, TITRE_MAX);
  const attestation = champ(formData, "attestation").slice(0, ATTESTATION_MAX) || ATTESTATION_DEFAUT;
  if (!titre) return { erreur: "Donnez un titre au document." };
  return { titre, attestation };
}

// Après publication : registre vierge dans le Drive, puis mail + notification aux profs.
async function suites(documentId: string, type: "PUBLICATION" | "NOUVELLE_VERSION", prevenir: boolean) {
  const notes: string[] = [];
  try {
    if (!(await regenererRegistreDocument(documentId))) notes.push("le registre n'a pas pu être créé dans le Drive (connexion Google à vérifier)");
  } catch (erreur) {
    console.error("Création du registre des signatures impossible :", erreur);
    notes.push("le registre n'a pas pu être créé dans le Drive");
  }
  let prevenus = 0;
  if (prevenir) prevenus = await prevenirSignataires(documentId, type, await urlBase());
  return { prevenus, notes };
}

export async function publierDocument(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  await exigerDirection();
  const textes = lireTextes(formData);
  if ("erreur" in textes) return { succes: false, message: textes.erreur };
  const fichier = await lirePdf(formData);
  if ("erreur" in fichier) return { succes: false, message: fichier.erreur };

  const document = await db.documentASigner.create({
    data: { titre: textes.titre, attestation: textes.attestation, pdf: fichier.pdf, nomFichier: fichier.nomFichier },
  });
  const { prevenus, notes } = await suites(document.id, "PUBLICATION", formData.get("prevenir") === "on");
  rafraichir();
  return {
    succes: true,
    message: `Document publié${prevenus ? `, ${prevenus} prof${prevenus > 1 ? "s" : ""} prévenu${prevenus > 1 ? "s" : ""} par mail` : ""}.${
      notes.length ? ` Attention : ${notes.join(", ")}.` : ""
    }`,
  };
}

// Nouvelle version : le PDF est remplacé et tout le monde doit re-signer. Les signatures
// des versions précédentes restent dans l'historique et le Drive.
export async function publierNouvelleVersion(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  await exigerDirection();
  const id = champ(formData, "id");
  const actuel = await db.documentASigner.findUnique({ where: { id }, select: { version: true } });
  if (!actuel) return { succes: false, message: "Document introuvable." };
  const textes = lireTextes(formData);
  if ("erreur" in textes) return { succes: false, message: textes.erreur };
  const fichier = await lirePdf(formData);
  if ("erreur" in fichier) return { succes: false, message: fichier.erreur };

  await db.documentASigner.update({
    where: { id },
    data: {
      titre: textes.titre,
      attestation: textes.attestation,
      pdf: fichier.pdf,
      nomFichier: fichier.nomFichier,
      version: actuel.version + 1,
      publieLe: new Date(),
      relanceLe: null,
      retireLe: null,
      registreFileId: null,
      registreUrl: null,
    },
  });
  const { prevenus, notes } = await suites(id, "NOUVELLE_VERSION", formData.get("prevenir") === "on");
  rafraichir();
  return {
    succes: true,
    message: `Version ${actuel.version + 1} publiée${prevenus ? `, ${prevenus} prof${prevenus > 1 ? "s" : ""} prévenu${prevenus > 1 ? "s" : ""}` : ""}.${
      notes.length ? ` Attention : ${notes.join(", ")}.` : ""
    }`,
  };
}

// Retirer un document le sort de la liste à signer (il reste dans l'historique) ; on peut
// le remettre en signature.
export async function basculerRetrait(formData: FormData) {
  await exigerDirection();
  const id = champ(formData, "id");
  const document = await db.documentASigner.findUnique({ where: { id }, select: { retireLe: true } });
  if (!document) return;
  await db.documentASigner.update({ where: { id }, data: { retireLe: document.retireLe ? null : new Date() } });
  rafraichir();
}

export async function mettreAJourDrive(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  await exigerDirection();
  try {
    const ok = await mettreAJourDriveDocument(champ(formData, "id"));
    rafraichir();
    return ok
      ? { succes: true, message: "Copies signées et registre à jour dans le Drive." }
      : { succes: false, message: "Le Drive n'a pas pu être mis à jour (connexion Google à vérifier dans les paramètres)." };
  } catch (erreur) {
    console.error("Mise à jour du Drive des documents signés impossible :", erreur);
    return { succes: false, message: "Le Drive n'a pas pu être mis à jour." };
  }
}
