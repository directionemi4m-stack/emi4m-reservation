"use server";

import { revalidatePath } from "next/cache";
import { extractText, getDocumentProxy } from "unpdf";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { devinerFacture, lireNomFacture, nomFichierFacture, normaliserNomFichier } from "@/lib/factures";
import { lireEuros } from "@/lib/inventaire";
import { photosEnPdf } from "@/lib/photoEnPdf";
import { deposerFacture, estJetonRevoqueOuExpire, mettreALaCorbeilleDrive, renommerFichierDrive } from "@/lib/drive";

export type EtatAction = { succes: boolean; message?: string };

async function exigerAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") throw new Error("Accès réservé à la direction.");
}

function champ(formData: FormData, nom: string) {
  return String(formData.get(nom) ?? "").trim();
}

const TAILLE_MAX = 10 * 1024 * 1024;
const estPdf = (o: Uint8Array) => Buffer.from(o.subarray(0, 5)).toString() === "%PDF-";
const estJpeg = (o: Uint8Array) => o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff;
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

async function lireFichiers(formData: FormData) {
  return Promise.all(
    formData
      .getAll("fichiers")
      .filter((f): f is File => f instanceof File && f.size > 0)
      .map(async (f) => new Uint8Array(await f.arrayBuffer()))
  );
}

async function fournisseursConnus(): Promise<string[]> {
  const lignes = await db.facture.findMany({ distinct: ["fournisseur"], select: { fournisseur: true } });
  return lignes.map((l) => l.fournisseur);
}

export type PropositionLue = {
  nomFichier: string;
  montantCentimes: number | null;
  lu: boolean; // true : nom proposé à partir du texte du PDF
};

// Première étape : propose un nom de fichier (sans rien enregistrer). Pour un PDF qui
// contient du texte, la date et l'entreprise y sont cherchées (« 2026-10-28_Thomann.pdf ») ;
// sinon (scan, photos) le nom commence par la date du jour, à compléter.
export async function analyserFacture(formData: FormData): Promise<PropositionLue> {
  await exigerAdmin();
  const aujourdHui = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });

  const [fichier] = await lireFichiers(formData);
  if (fichier && estPdf(fichier) && fichier.length <= TAILLE_MAX) {
    try {
      const document = await getDocumentProxy(Uint8Array.from(fichier));
      const { text } = await extractText(document, { mergePages: false });
      const texte = (Array.isArray(text) ? text : [text]).slice(0, 3).join("\n");
      const devine = devinerFacture(texte, await fournisseursConnus(), new Date());
      if (devine.fournisseur) {
        return {
          nomFichier: nomFichierFacture(devine.date ?? aujourdHui, devine.fournisseur),
          montantCentimes: devine.montantCentimes,
          lu: true,
        };
      }
    } catch (erreur) {
      // PDF scanné (image seule) ou protégé : on propose juste la date du jour.
      console.error("Lecture du texte de la facture impossible :", erreur);
    }
  }
  return { nomFichier: `${aujourdHui}_`, montantCentimes: null, lu: false };
}

interface ChampsFacture {
  date: Date;
  fournisseur: string;
  montantCentimes: number | null;
  objet: string | null;
  nomFichier: string;
  articleIds: string[];
}

// Date et entreprise servent au classement (dossier de l'année, liste) : saisies à part
// quand on modifie une facture, sinon tirées du nom du fichier (« 2026-10-28_Thomann.pdf »).
async function lireChamps(formData: FormData): Promise<{ erreur: string } | { champs: ChampsFacture }> {
  const nomSaisi = champ(formData, "nomFichier");
  const duNom = lireNomFacture(nomSaisi);
  const aujourdHui = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
  const dateBrute = champ(formData, "date") || duNom.date || aujourdHui;
  const fournisseur = (champ(formData, "fournisseur") || duNom.fournisseur || "").slice(0, 80);
  const montantBrut = champ(formData, "montant");
  if (!nomSaisi && !champ(formData, "fournisseur")) return { erreur: "Donnez un nom au fichier." };
  if (!DATE_ISO.test(dateBrute)) return { erreur: "Date invalide." };
  if (!fournisseur) return { erreur: "Ajoutez le nom de l'entreprise après la date (ex. 2026-10-28_Thomann)." };
  const montantCentimes = montantBrut ? lireEuros(montantBrut) : null;
  if (montantBrut && montantCentimes === null) return { erreur: "Montant invalide (ex. 49,80)." };

  const articleIds = [...new Set(formData.getAll("articleIds").map(String).filter(Boolean))];
  if (articleIds.length) {
    const trouves = await db.articleInventaire.count({ where: { id: { in: articleIds } } });
    if (trouves !== articleIds.length) return { erreur: "Un bien de l'inventaire est introuvable." };
  }
  return {
    champs: {
      date: new Date(`${dateBrute}T00:00:00.000Z`),
      fournisseur,
      montantCentimes,
      objet: champ(formData, "objet").slice(0, 200) || null,
      nomFichier: normaliserNomFichier(nomSaisi || nomFichierFacture(dateBrute, fournisseur)),
      articleIds,
    },
  };
}

// Deux factures ne portent jamais le même nom : « 2026-10-28_Thomann (2).pdf ».
async function nomLibre(nom: string, saufId?: string): Promise<string> {
  const base = nom.replace(/\.pdf$/i, "");
  for (let n = 1; ; n++) {
    const candidat = n === 1 ? nom : `${base} (${n}).pdf`;
    const pris = await db.facture.findFirst({ where: { nomFichier: candidat, ...(saufId ? { id: { not: saufId } } : {}) } });
    if (!pris) return candidat;
  }
}

function revalider() {
  revalidatePath("/admin/achats");
  revalidatePath("/admin/inventaire");
}

// Seconde étape, après validation : construit le PDF (photos assemblées si besoin) et
// l'archive dans le Drive sous le nom validé.
export async function archiverFacture(formData: FormData): Promise<EtatAction> {
  await exigerAdmin();
  const lus = await lireChamps(formData);
  if ("erreur" in lus) return { succes: false, message: lus.erreur };
  const { champs } = lus;

  const fichiers = await lireFichiers(formData);
  if (fichiers.length === 0) return { succes: false, message: "Aucun fichier reçu." };
  if (fichiers.reduce((s, f) => s + f.length, 0) > TAILLE_MAX) return { succes: false, message: "Fichiers trop lourds (10 Mo au total)." };

  let pdf: Buffer;
  if (fichiers.length === 1 && estPdf(fichiers[0])) pdf = Buffer.from(fichiers[0]);
  else if (fichiers.every(estJpeg)) pdf = Buffer.from(await photosEnPdf(fichiers));
  else return { succes: false, message: "Envoyez un PDF, ou des photos." };

  const nomFichier = await nomLibre(champs.nomFichier);
  try {
    const fichier = await deposerFacture({ annee: champs.date.getUTCFullYear(), nomFichier, pdf });
    if (!fichier) return { succes: false, message: "Envoi vers Google Drive indisponible." };
    await db.facture.create({
      data: {
        date: champs.date,
        fournisseur: champs.fournisseur,
        montantCentimes: champs.montantCentimes,
        objet: champs.objet,
        nomFichier,
        driveFileId: fichier.id,
        url: fichier.url,
        articles: { connect: champs.articleIds.map((id) => ({ id })) },
      },
    });
  } catch (erreur) {
    console.error("Archivage de la facture impossible :", erreur);
    return {
      succes: false,
      message: estJetonRevoqueOuExpire(erreur)
        ? "La connexion à Google Drive a expiré : reconnectez-la dans Paramètres."
        : "L'envoi a échoué. Réessayez dans quelques instants.",
    };
  }
  revalider();
  return { succes: true, message: `Facture archivée : ${nomFichier}` };
}

// Correction après coup ; un nouveau nom renomme aussi le fichier dans le Drive.
export async function modifierFacture(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  await exigerAdmin();
  const facture = await db.facture.findUnique({ where: { id: champ(formData, "id") } });
  if (!facture) return { succes: false, message: "Cette facture n'existe plus." };
  const lus = await lireChamps(formData);
  if ("erreur" in lus) return { succes: false, message: lus.erreur };
  const { champs } = lus;

  const nomFichier = champs.nomFichier === facture.nomFichier ? facture.nomFichier : await nomLibre(champs.nomFichier, facture.id);
  if (nomFichier !== facture.nomFichier) {
    try {
      await renommerFichierDrive(facture.driveFileId, nomFichier);
    } catch (erreur) {
      console.error("Renommage de la facture dans le Drive impossible :", erreur);
      return { succes: false, message: "Le fichier n'a pas pu être renommé dans le Drive." };
    }
  }
  await db.facture.update({
    where: { id: facture.id },
    data: {
      date: champs.date,
      fournisseur: champs.fournisseur,
      montantCentimes: champs.montantCentimes,
      objet: champs.objet,
      nomFichier,
      articles: { set: champs.articleIds.map((id) => ({ id })) },
    },
  });
  revalider();
  return { succes: true, message: "Enregistré." };
}

// Supprimer une facture l'envoie dans la corbeille du Drive (récupérable 30 jours).
export async function supprimerFacture(formData: FormData) {
  await exigerAdmin();
  const facture = await db.facture.findUnique({ where: { id: champ(formData, "id") } });
  if (!facture) return;
  try {
    await mettreALaCorbeilleDrive(facture.driveFileId);
  } catch (erreur) {
    console.error("Mise à la corbeille de la facture impossible :", erreur);
  }
  await db.facture.delete({ where: { id: facture.id } });
  revalider();
}

// Rattache une facture déjà archivée à un bien de l'inventaire, ou l'en détache.
export async function lierFacture(formData: FormData) {
  await exigerAdmin();
  const articleId = champ(formData, "articleId");
  const factureId = champ(formData, "factureId");
  if (!articleId || !factureId) return;
  await db.articleInventaire.update({
    where: { id: articleId },
    data: { factures: formData.get("delier") ? { disconnect: { id: factureId } } : { connect: { id: factureId } } },
  });
  revalider();
}
