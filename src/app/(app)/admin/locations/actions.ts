"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reconduire } from "@/lib/locations";
import { photosEnPdf } from "@/lib/photoEnPdf";
import { deposerDocumentLocation, estJetonRevoqueOuExpire, mettreALaCorbeilleDrive } from "@/lib/drive";
import { synchroniserLocations } from "@/lib/sheets";
import type { CautionLocation, ModePaiementLocation } from "@/generated/prisma/client";

export type EtatAction = { succes: boolean; message?: string };

// Données des familles : réservé à la direction, vérifié côté serveur.
async function exigerAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") throw new Error("Accès réservé à la direction.");
}

function champ(formData: FormData, nom: string) {
  return String(formData.get(nom) ?? "").trim();
}

function lireAnnee(formData: FormData): number | null {
  const n = Number(formData.get("anneeDebut"));
  return Number.isInteger(n) && n >= 2000 && n <= 2100 ? n : null;
}

// Le classeur n'est qu'un reflet : une erreur Google ne doit jamais faire échouer la saisie.
async function synchroniser(anneeDebut: number) {
  try {
    await synchroniserLocations(anneeDebut);
  } catch (erreur) {
    console.error("Synchronisation du classeur des locations impossible :", erreur);
  }
  revalidatePath("/admin/locations");
}

export async function enregistrerLocation(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  await exigerAdmin();
  const id = champ(formData, "id");
  const anneeDebut = lireAnnee(formData);
  const instrument = champ(formData, "instrument").slice(0, 60);
  const prenom = champ(formData, "prenom").slice(0, 60);
  const nom = champ(formData, "nom").slice(0, 80);
  const anneeLocation = Number(formData.get("anneeLocation"));
  const nbMoisBrut = champ(formData, "nbMois");
  const mode = champ(formData, "modePaiement");
  const caution = champ(formData, "caution");

  if (!anneeDebut) return { succes: false, message: "Saison invalide." };
  if (!instrument || !prenom || !nom) return { succes: false, message: "Instrument, prénom et nom sont obligatoires." };
  if (!Number.isInteger(anneeLocation) || anneeLocation < 1 || anneeLocation > 20) {
    return { succes: false, message: "Année de location invalide." };
  }
  const nbMois = nbMoisBrut ? Number(nbMoisBrut) : null;
  if (nbMois !== null && ![9, 12].includes(nbMois)) return { succes: false, message: "Durée : 9 ou 12 mois." };
  if (mode && !["CHEQUE", "VIREMENT"].includes(mode)) return { succes: false, message: "Mode de paiement invalide." };
  if (caution && !["RECUE", "MANQUANTE", "RENDUE"].includes(caution)) return { succes: false, message: "Caution invalide." };

  const donnees = {
    anneeDebut,
    instrument,
    prenom,
    nom,
    anneeLocation,
    nbMois,
    paye: formData.get("paye") === "on",
    modePaiement: (mode || null) as ModePaiementLocation | null,
    caution: (caution || null) as CautionLocation | null,
    commentaire: champ(formData, "commentaire").slice(0, 500) || null,
  };

  if (id) {
    const avant = await db.locationInstrument.findUnique({ where: { id } });
    if (!avant) return { succes: false, message: "Cette location n'existe plus." };
    await db.locationInstrument.update({ where: { id }, data: donnees });
    if (avant.anneeDebut !== anneeDebut) await synchroniser(avant.anneeDebut);
  } else {
    await db.locationInstrument.create({ data: donnees });
  }
  await synchroniser(anneeDebut);
  return { succes: true, message: id ? "Enregistré." : "Location ajoutée." };
}

// Passe une location en payée / non payée d'un geste, depuis la liste.
export async function basculerPaiement(formData: FormData) {
  await exigerAdmin();
  const location = await db.locationInstrument.findUnique({ where: { id: champ(formData, "id") } });
  if (!location) return;
  await db.locationInstrument.update({ where: { id: location.id }, data: { paye: !location.paye } });
  await synchroniser(location.anneeDebut);
}

// Supprime la ligne de l'appli et du classeur. Les documents déjà archivés restent dans le
// dossier Drive de la location.
export async function supprimerLocation(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  await exigerAdmin();
  const location = await db.locationInstrument.findUnique({ where: { id: champ(formData, "id") } });
  if (!location) return { succes: false, message: "Cette location n'existe plus." };
  await db.locationInstrument.delete({ where: { id: location.id } });
  await synchroniser(location.anneeDebut);
  return { succes: true };
}

// Prépare une saison à partir de la précédente : chaque location passe à l'année suivante,
// non payée. Les élèves déjà saisis dans la nouvelle saison ne sont pas dupliqués.
export async function reconduireSaison(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  await exigerAdmin();
  const anneeDebut = lireAnnee(formData);
  if (!anneeDebut) return { succes: false, message: "Saison invalide." };

  const [precedentes, presentes] = await Promise.all([
    db.locationInstrument.findMany({ where: { anneeDebut: anneeDebut - 1 } }),
    db.locationInstrument.findMany({ where: { anneeDebut }, select: { prenom: true, nom: true, instrument: true } }),
  ]);
  const nouvelles = reconduire(precedentes, presentes);
  if (nouvelles.length === 0) return { succes: false, message: "Rien à reconduire." };

  await db.locationInstrument.createMany({ data: nouvelles.map((l) => ({ ...l, anneeDebut })) });
  await synchroniser(anneeDebut);
  return { succes: true, message: `${nouvelles.length} location(s) reconduite(s). Supprimez celles qui s'arrêtent.` };
}

// --- Demandes en attente ---

export async function ajouterDemande(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  await exigerAdmin();
  const anneeDebut = lireAnnee(formData);
  const instrument = champ(formData, "instrument").slice(0, 60);
  const prenom = champ(formData, "prenom").slice(0, 60);
  const nom = champ(formData, "nom").slice(0, 80);
  if (!anneeDebut) return { succes: false, message: "Saison invalide." };
  if (!instrument || !prenom || !nom) return { succes: false, message: "Instrument, prénom et nom sont obligatoires." };

  await db.demandeLocation.create({
    data: { anneeDebut, instrument, prenom, nom, commentaire: champ(formData, "commentaire").slice(0, 500) || null },
  });
  await synchroniser(anneeDebut);
  return { succes: true, message: "Demande ajoutée." };
}

export async function supprimerDemande(formData: FormData) {
  await exigerAdmin();
  const demande = await db.demandeLocation.findUnique({ where: { id: champ(formData, "id") } });
  if (!demande) return;
  await db.demandeLocation.delete({ where: { id: demande.id } });
  await synchroniser(demande.anneeDebut);
}

// Un instrument s'est libéré : la demande devient une location de 1re année.
export async function passerEnLocation(formData: FormData) {
  await exigerAdmin();
  const demande = await db.demandeLocation.findUnique({ where: { id: champ(formData, "id") } });
  if (!demande) return;
  await db.$transaction([
    db.locationInstrument.create({
      data: {
        anneeDebut: demande.anneeDebut,
        instrument: demande.instrument,
        prenom: demande.prenom,
        nom: demande.nom,
        anneeLocation: 1,
        commentaire: demande.commentaire,
      },
    }),
    db.demandeLocation.delete({ where: { id: demande.id } }),
  ]);
  await synchroniser(demande.anneeDebut);
}

// --- Documents archivés ---

const TAILLE_MAX = 10 * 1024 * 1024;

// Un document rendu par la famille : soit un PDF, soit une ou plusieurs photos (déjà
// réduites en JPEG par le navigateur) assemblées ici en un seul PDF. Archivé dans le
// dossier Drive de la location.
export async function deposerDocument(formData: FormData): Promise<EtatAction> {
  await exigerAdmin();
  const location = await db.locationInstrument.findUnique({ where: { id: champ(formData, "locationId") } });
  if (!location) return { succes: false, message: "Location introuvable." };
  const libelle = (champ(formData, "libelle") || "Document").replace(/[\\/:*?"<>|]/g, "-").slice(0, 60);

  const fichiers = formData.getAll("fichiers").filter((f): f is File => f instanceof File && f.size > 0);
  if (fichiers.length === 0) return { succes: false, message: "Aucun fichier reçu." };
  if (fichiers.reduce((s, f) => s + f.size, 0) > TAILLE_MAX) return { succes: false, message: "Fichiers trop lourds (10 Mo au total)." };

  let pdf: Buffer;
  try {
    const contenus = await Promise.all(fichiers.map(async (f) => new Uint8Array(await f.arrayBuffer())));
    const estPdf = (o: Uint8Array) => Buffer.from(o.subarray(0, 5)).toString() === "%PDF-";
    const estJpeg = (o: Uint8Array) => o[0] === 0xff && o[1] === 0xd8;
    if (contenus.length === 1 && estPdf(contenus[0])) {
      pdf = Buffer.from(contenus[0]);
    } else if (contenus.every(estJpeg)) {
      pdf = Buffer.from(await photosEnPdf(contenus));
    } else {
      return { succes: false, message: "Envoyez un PDF, ou des photos." };
    }
  } catch (erreur) {
    console.error("Préparation du document de location impossible :", erreur);
    return { succes: false, message: "Ce fichier n'a pas pu être lu." };
  }

  const date = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" }); // 2026-10-30
  const nomFichier = `${location.nom.toUpperCase()} ${location.prenom} — ${libelle} — ${date}.pdf`;
  try {
    const fichier = await deposerDocumentLocation({ locationId: location.id, nomFichier, mimeType: "application/pdf", contenu: pdf });
    if (!fichier) return { succes: false, message: "Envoi vers Google Drive indisponible." };
    await db.documentLocation.create({ data: { locationId: location.id, nomFichier, driveFileId: fichier.id, url: fichier.url } });
  } catch (erreur) {
    console.error("Archivage du document de location impossible :", erreur);
    return {
      succes: false,
      message: estJetonRevoqueOuExpire(erreur)
        ? "La connexion à Google Drive a expiré : reconnectez-la dans Paramètres."
        : "L'envoi a échoué. Réessayez dans quelques instants.",
    };
  }
  await synchroniser(location.anneeDebut);
  return { succes: true, message: "Document archivé." };
}

// Retire un document : il part dans la corbeille du Drive (récupérable), pas supprimé.
export async function retirerDocument(formData: FormData) {
  await exigerAdmin();
  const document = await db.documentLocation.findUnique({
    where: { id: champ(formData, "id") },
    include: { location: { select: { anneeDebut: true } } },
  });
  if (!document) return;
  try {
    await mettreALaCorbeilleDrive(document.driveFileId);
  } catch (erreur) {
    console.error("Mise à la corbeille du document impossible :", erreur);
  }
  await db.documentLocation.delete({ where: { id: document.id } });
  await synchroniser(document.location.anneeDebut);
}
