"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lireLignesAchat, prochainNumeroAchat } from "@/lib/attestationAchat";
import { enregistrerSignature, nomFichierAttestation, pdfAttestation } from "@/lib/attestationAchatServeur";
import { lireSignature } from "@/lib/bulletinsCham";
import { photosEnPdf } from "@/lib/photoEnPdf";
import { deposerDocumentDevis, estJetonRevoqueOuExpire } from "@/lib/drive";
import type { DestinationAchat, ModePaiementAchat } from "@/generated/prisma/client";

export type EtatAction = { succes: boolean; message?: string };

async function exigerAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") throw new Error("Accès réservé à la direction.");
}

const champ = (fd: FormData, nom: string, max = 300) => String(fd.get(nom) ?? "").trim().slice(0, max);
const optionnel = (fd: FormData, nom: string, max = 300) => champ(fd, nom, max) || null;
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;
const date = (fd: FormData, nom: string) => (DATE_ISO.test(champ(fd, nom, 10)) ? new Date(`${champ(fd, nom, 10)}T00:00:00.000Z`) : null);
const MODES = ["VIREMENT", "CHEQUE", "ESPECES"];
const DESTINATIONS = ["ECOLE", "LOCATION"];

function revalider() {
  revalidatePath("/admin/achats", "layout");
  revalidatePath("/admin/inventaire");
}

// Création ou modification (tant que l'attestation n'est pas signée).
export async function enregistrerAttestation(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await exigerAdmin();
  const vendeurNom = champ(fd, "vendeurNom", 120);
  if (!vendeurNom) return { succes: false, message: "Le nom du vendeur est requis." };
  const lus = lireLignesAchat({
    designations: fd.getAll("lDesignation").map(String),
    marques: fd.getAll("lMarque").map(String),
    series: fd.getAll("lSerie").map(String),
    etats: fd.getAll("lEtat").map(String),
    prix: fd.getAll("lPrix").map(String),
  });
  if ("erreur" in lus) return { succes: false, message: lus.erreur };
  const jour = date(fd, "date") ?? new Date(`${new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" })}T00:00:00.000Z`);
  const mode = champ(fd, "modePaiement", 10);
  const destination = champ(fd, "destination", 10);
  const donnees = {
    date: jour,
    vendeurNom,
    vendeurAdresse: optionnel(fd, "vendeurAdresse", 300),
    vendeurTelephone: optionnel(fd, "vendeurTelephone", 40),
    vendeurEmail: optionnel(fd, "vendeurEmail", 200),
    vendeurPiece: optionnel(fd, "vendeurPiece", 120),
    representant: optionnel(fd, "representant", 120),
    qualite: optionnel(fd, "qualite", 120),
    faitA: optionnel(fd, "faitA", 80),
    modePaiement: MODES.includes(mode) ? (mode as ModePaiementAchat) : null,
    referencePaiement: optionnel(fd, "referencePaiement", 80),
    banque: optionnel(fd, "banque", 80),
    datePaiement: date(fd, "datePaiement"),
    dateRemise: date(fd, "dateRemise"),
    demandePar: optionnel(fd, "demandePar", 120),
    motif: optionnel(fd, "motif", 200),
    destination: DESTINATIONS.includes(destination) ? (destination as DestinationAchat) : null,
    affectation: optionnel(fd, "affectation", 120),
  };
  const lignes = lus.lignes.map((l, i) => ({ ...l, ordre: i + 1 }));

  const id = champ(fd, "id", 40);
  if (id) {
    const avant = await db.attestationAchat.findUnique({ where: { id } });
    if (!avant) return { succes: false, message: "Cette attestation n'existe plus." };
    if (avant.signeLe) return { succes: false, message: "Une attestation signée ne se modifie plus." };
    await db.$transaction([
      db.ligneAttestationAchat.deleteMany({ where: { attestationId: id } }),
      db.attestationAchat.update({ where: { id }, data: { ...donnees, lignes: { create: lignes } } }),
    ]);
    revalider();
    redirect(`/admin/achats/occasion/${id}`);
  }
  const annee = jour.getUTCFullYear();
  const existants = (await db.attestationAchat.findMany({ where: { annee }, select: { numero: true } })).map((x) => x.numero);
  const cree = await db.attestationAchat.create({ data: { ...donnees, annee, numero: prochainNumeroAchat(annee, existants), lignes: { create: lignes } } });
  revalider();
  redirect(`/admin/achats/occasion/${cree.id}`);
}

export async function supprimerAttestation(fd: FormData) {
  await exigerAdmin();
  const a = await db.attestationAchat.findUnique({ where: { id: champ(fd, "id", 40) } });
  if (!a || a.signeLe) return;
  await db.attestationAchat.delete({ where: { id: a.id } });
  revalider();
  redirect("/admin/achats/occasion");
}

const TAILLE_MAX = 10 * 1024 * 1024;
const estPdf = (o: Uint8Array) => Buffer.from(o.subarray(0, 5)).toString() === "%PDF-";
const estJpeg = (o: Uint8Array) => o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff;
async function enPdf(fd: FormData, nom: string): Promise<Buffer | null | { erreur: string }> {
  const fichiers = await Promise.all(
    fd.getAll(nom).filter((f): f is File => f instanceof File && f.size > 0).map(async (f) => new Uint8Array(await f.arrayBuffer()))
  );
  if (fichiers.length === 0) return null;
  if (fichiers.reduce((s, f) => s + f.length, 0) > TAILLE_MAX) return { erreur: "Fichiers trop lourds (10 Mo au total)." };
  if (fichiers.length === 1 && estPdf(fichiers[0])) return Buffer.from(fichiers[0]);
  if (fichiers.every(estJpeg)) return Buffer.from(await photosEnPdf(fichiers));
  return { erreur: "Envoyez un PDF, ou des photos." };
}

// Attestation signée par les deux parties : archivée dans le Drive (« Achats d'occasion /
// année »), avec la copie de la pièce d'identité du vendeur ; ajoutée aux factures d'achat
// et, si demandé, le matériel entre à l'inventaire.
export async function archiverAttestationSignee(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await exigerAdmin();
  const a = await db.attestationAchat.findUnique({ where: { id: champ(fd, "id", 40) }, include: { lignes: { orderBy: { ordre: "asc" } } } });
  if (!a) return { succes: false, message: "Cette attestation n'existe plus." };
  const signee = await enPdf(fd, "fichiers");
  if (!signee) return { succes: false, message: "Ajoutez le scan ou les photos de l'attestation signée." };
  if ("erreur" in signee) return { succes: false, message: signee.erreur };
  const piece = await enPdf(fd, "piece");
  if (piece && "erreur" in piece) return { succes: false, message: `Pièce d'identité : ${piece.erreur}` };

  let depot: { id: string; url: string } | null;
  let depotPiece: { id: string; url: string } | null = null;
  try {
    depot = await deposerDocumentDevis({
      dossier: "Achats d'occasion",
      annee: a.annee,
      nomFichier: nomFichierAttestation(a.numero, a.vendeurNom, " - signée"),
      pdf: signee,
      fichierExistantId: a.signeDriveFileId,
    });
    if (!depot) return { succes: false, message: "Envoi vers Google Drive indisponible." };
    if (piece) {
      depotPiece = await deposerDocumentDevis({
        dossier: "Achats d'occasion",
        annee: a.annee,
        nomFichier: nomFichierAttestation(a.numero, a.vendeurNom, " - pièce d'identité"),
        pdf: piece,
        fichierExistantId: a.pieceDriveFileId,
      });
    }
  } catch (erreur) {
    console.error("Archivage de l'attestation impossible :", erreur);
    return {
      succes: false,
      message: estJetonRevoqueOuExpire(erreur) ? "La connexion à Google Drive a expiré : reconnectez-la dans Paramètres." : "L'envoi vers le Drive a échoué. Réessayez.",
    };
  }

  await enregistrerSignature(a.id, depot, depotPiece, fd.get("inventaire") === "on");
  revalider();
  return { succes: true, message: "Attestation signée archivée dans le Drive et ajoutée aux achats." };
}

// Signature sur place, au doigt sur le téléphone : le vendeur puis la direction signent ;
// l'attestation signée est générée, archivée dans le Drive et ajoutée aux achats.
export async function signerSurPlace(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  const session = await auth();
  if (session?.user.role !== "ADMIN") throw new Error("Accès réservé à la direction.");
  const a = await db.attestationAchat.findUnique({ where: { id: champ(fd, "id", 40) } });
  if (!a) return { succes: false, message: "Cette attestation n'existe plus." };
  if (fd.get("luEtApprouve") !== "on") return { succes: false, message: "Le vendeur doit cocher « Lu et approuvé, bon pour vente »." };
  const vendeur = lireSignature(String(fd.get("signatureVendeur") ?? ""));
  if (!vendeur) return { succes: false, message: "La signature du vendeur est requise." };
  const acheteur = lireSignature(String(fd.get("signatureAcheteur") ?? ""));
  if (!acheteur) return { succes: false, message: "Votre signature pour l'EMI4M est requise." };
  const piece = await enPdf(fd, "piece");
  if (piece && "erreur" in piece) return { succes: false, message: `Pièce d'identité : ${piece.erreur}` };

  const maintenant = new Date();
  await db.attestationAchat.update({
    where: { id: a.id },
    data: { signatureVendeur: Uint8Array.from(vendeur), signatureAcheteur: Uint8Array.from(acheteur), signeSurPlaceLe: maintenant },
  });
  // La signature de la direction est gardée pour la prochaine fois (comme pour les bulletins et les clés).
  await db.signatureBulletin.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, image: Uint8Array.from(acheteur) },
    update: { image: Uint8Array.from(acheteur) },
  });

  const fichier = await pdfAttestation(a.id);
  if (!fichier) return { succes: false, message: "Attestation introuvable." };
  try {
    const depot = await deposerDocumentDevis({
      dossier: "Achats d'occasion",
      annee: a.annee,
      nomFichier: nomFichierAttestation(a.numero, a.vendeurNom, " - signée"),
      pdf: fichier.pdf,
      fichierExistantId: a.signeDriveFileId,
    });
    if (!depot) return { succes: false, message: "Signatures enregistrées, mais le Drive est indisponible : réessayez l'archivage plus tard." };
    const depotPiece = piece
      ? await deposerDocumentDevis({
          dossier: "Achats d'occasion",
          annee: a.annee,
          nomFichier: nomFichierAttestation(a.numero, a.vendeurNom, " - pièce d'identité"),
          pdf: piece,
          fichierExistantId: a.pieceDriveFileId,
        })
      : null;
    await enregistrerSignature(a.id, depot, depotPiece, fd.get("inventaire") === "on");
  } catch (erreur) {
    console.error("Archivage de l'attestation signée impossible :", erreur);
    return {
      succes: false,
      message: estJetonRevoqueOuExpire(erreur)
        ? "Signatures enregistrées, mais la connexion à Google Drive a expiré : reconnectez-la dans Paramètres puis réessayez."
        : "Signatures enregistrées, mais l'envoi vers le Drive a échoué. Réessayez.",
    };
  }
  revalider();
  return { succes: true, message: "Attestation signée par les deux parties, archivée dans le Drive et ajoutée aux achats." };
}
