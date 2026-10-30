"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CATEGORIES_INVENTAIRE, ETATS_MATERIEL, lireEuros, nomDossierArticle } from "@/lib/inventaire";
import { deposerPhotoInventaire, estJetonRevoqueOuExpire, mettreALaCorbeilleDrive } from "@/lib/drive";
import type { CategorieInventaire, EtatMateriel } from "@/generated/prisma/client";

export type EtatAction = { succes: boolean; message?: string };

async function exigerAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") throw new Error("Accès réservé à la direction.");
}

function champ(formData: FormData, nom: string) {
  return String(formData.get(nom) ?? "").trim();
}

const CATEGORIES = CATEGORIES_INVENTAIRE.map((c) => c.valeur) as readonly string[];
const ETATS = ETATS_MATERIEL.map((e) => e.valeur) as readonly string[];

export async function enregistrerArticle(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  await exigerAdmin();
  const id = champ(formData, "id");
  const designation = champ(formData, "designation").slice(0, 120);
  const categorie = champ(formData, "categorie");
  const etat = champ(formData, "etat") || "BON";
  const numeroBrut = champ(formData, "numeroImmo");
  const dateBrute = champ(formData, "dateAcquisition");
  const valeurBrute = champ(formData, "valeur");
  const lieuId = champ(formData, "lieuId") || null;

  if (!designation) return { succes: false, message: "La désignation est obligatoire." };
  if (!CATEGORIES.includes(categorie)) return { succes: false, message: "Catégorie invalide." };
  if (!ETATS.includes(etat)) return { succes: false, message: "État invalide." };
  const numeroImmo = numeroBrut ? Number(numeroBrut) : null;
  if (numeroImmo !== null && (!Number.isInteger(numeroImmo) || numeroImmo < 1)) {
    return { succes: false, message: "N° d'immobilisation invalide." };
  }
  const valeurCentimes = valeurBrute ? lireEuros(valeurBrute) : null;
  if (valeurBrute && valeurCentimes === null) return { succes: false, message: "Valeur invalide (ex. 1 250,00)." };
  if (dateBrute && !/^\d{4}-\d{2}-\d{2}$/.test(dateBrute)) return { succes: false, message: "Date invalide." };
  if (lieuId && !(await db.lieuPresence.findUnique({ where: { id: lieuId }, select: { id: true } }))) {
    return { succes: false, message: "Commune introuvable." };
  }
  if (numeroImmo !== null) {
    const doublon = await db.articleInventaire.findUnique({ where: { numeroImmo }, select: { id: true, designation: true } });
    if (doublon && doublon.id !== id) return { succes: false, message: `Le N°${numeroImmo} est déjà pris (${doublon.designation}).` };
  }

  const donnees = {
    numeroImmo,
    designation,
    categorie: categorie as CategorieInventaire,
    marqueModele: champ(formData, "marqueModele").slice(0, 120) || null,
    numeroSerie: champ(formData, "numeroSerie").slice(0, 80) || null,
    dateAcquisition: dateBrute ? new Date(`${dateBrute}T00:00:00.000Z`) : null,
    valeurCentimes,
    lieuId,
    localisation: champ(formData, "localisation").slice(0, 120) || null,
    etat: etat as EtatMateriel,
    remarques: champ(formData, "remarques").slice(0, 1000) || null,
  };

  if (id) {
    if (!(await db.articleInventaire.findUnique({ where: { id }, select: { id: true } }))) {
      return { succes: false, message: "Ce bien n'existe plus." };
    }
    await db.articleInventaire.update({ where: { id }, data: donnees });
  } else {
    await db.articleInventaire.create({ data: donnees });
  }
  revalidatePath("/admin/inventaire");
  return { succes: true, message: id ? "Enregistré." : "Bien ajouté." };
}

// « Vu aujourd'hui » lors d'un inventaire physique.
export async function marquerVerifie(formData: FormData) {
  await exigerAdmin();
  await db.articleInventaire.updateMany({ where: { id: champ(formData, "id") }, data: { verifieLe: new Date() } });
  revalidatePath("/admin/inventaire");
}

// Pour une erreur de saisie seulement : un bien vendu ou jeté passe en « Sorti de
// l'inventaire », ce qui garde son historique. Les photos restent dans le Drive.
export async function supprimerArticle(formData: FormData) {
  await exigerAdmin();
  await db.articleInventaire.deleteMany({ where: { id: champ(formData, "id") } });
  revalidatePath("/admin/inventaire");
}

const TAILLE_MAX = 10 * 1024 * 1024;
const PHOTOS_MAX = 8;

const estJpeg = (o: Uint8Array) => o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff;

// Photos d'un bien, déjà réduites par le navigateur : chaque photo arrive avec sa
// miniature (même ordre). L'original va dans le Drive, la miniature en base.
export async function ajouterPhotos(formData: FormData): Promise<EtatAction> {
  await exigerAdmin();
  const article = await db.articleInventaire.findUnique({ where: { id: champ(formData, "articleId") } });
  if (!article) return { succes: false, message: "Bien introuvable." };

  const lire = async (nom: string) =>
    Promise.all(
      formData
        .getAll(nom)
        .filter((f): f is File => f instanceof File && f.size > 0)
        .map(async (f) => new Uint8Array(await f.arrayBuffer()))
    );
  const [photos, miniatures] = await Promise.all([lire("photos"), lire("miniatures")]);
  if (photos.length === 0 || photos.length !== miniatures.length) return { succes: false, message: "Aucune photo reçue." };
  if (photos.length > PHOTOS_MAX) return { succes: false, message: `${PHOTOS_MAX} photos au plus par envoi.` };
  if ([...photos, ...miniatures].reduce((s, p) => s + p.length, 0) > TAILLE_MAX) {
    return { succes: false, message: "Photos trop lourdes (10 Mo au total)." };
  }
  if (![...photos, ...miniatures].every(estJpeg)) return { succes: false, message: "Format de photo non reconnu." };

  const date = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
  const dejaLa = await db.photoInventaire.count({ where: { articleId: article.id } });
  try {
    for (const [i, photo] of photos.entries()) {
      const fichier = await deposerPhotoInventaire({
        articleId: article.id,
        nomDossier: nomDossierArticle(article),
        nomFichier: `${nomDossierArticle(article)} — photo ${dejaLa + i + 1} — ${date}.jpg`,
        jpeg: Buffer.from(photo),
      });
      if (!fichier) return { succes: false, message: "Envoi vers Google Drive indisponible." };
      await db.photoInventaire.create({
        data: { articleId: article.id, driveFileId: fichier.id, url: fichier.url, miniature: miniatures[i] },
      });
    }
  } catch (erreur) {
    console.error("Envoi d'une photo d'inventaire impossible :", erreur);
    revalidatePath("/admin/inventaire");
    return {
      succes: false,
      message: estJetonRevoqueOuExpire(erreur)
        ? "La connexion à Google Drive a expiré : reconnectez-la dans Paramètres."
        : "L'envoi a échoué. Réessayez dans quelques instants.",
    };
  }
  revalidatePath("/admin/inventaire");
  return { succes: true, message: photos.length > 1 ? `${photos.length} photos ajoutées.` : "Photo ajoutée." };
}

// Retire une photo : l'original part dans la corbeille du Drive (récupérable).
export async function retirerPhoto(formData: FormData) {
  await exigerAdmin();
  const photo = await db.photoInventaire.findUnique({ where: { id: champ(formData, "id") } });
  if (!photo) return;
  try {
    await mettreALaCorbeilleDrive(photo.driveFileId);
  } catch (erreur) {
    console.error("Mise à la corbeille de la photo impossible :", erreur);
  }
  await db.photoInventaire.delete({ where: { id: photo.id } });
  revalidatePath("/admin/inventaire");
}
