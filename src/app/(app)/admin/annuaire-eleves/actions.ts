"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ErreurTableur, lireTableur, TAILLE_MAX_TABLEUR, type Feuille } from "@/lib/lectureTableur";
import { correspondanceAMemoriser, estCleChamp, extraireEleves, type Correspondance } from "@/lib/annuaireEleves";

export type EtatAction = { succes: boolean; message?: string };

export type LectureFichier =
  | { succes: false; message: string }
  | { succes: true; feuilles: string[]; feuille: number; lignes: string[][] };

async function exigerAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") throw new Error("Accès réservé à la direction.");
  return session;
}

async function lireFichier(formData: FormData): Promise<{ erreur: string } | { feuilles: Feuille[]; nomFichier: string }> {
  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) return { erreur: "Choisissez le fichier Excel des inscriptions." };
  if (fichier.size > TAILLE_MAX_TABLEUR) return { erreur: "Fichier trop volumineux (10 Mo maximum)." };
  try {
    return { feuilles: lireTableur(new Uint8Array(await fichier.arrayBuffer()), fichier.name), nomFichier: fichier.name };
  } catch (e) {
    if (e instanceof ErreurTableur) return { erreur: e.message };
    throw e;
  }
}

const numero = (v: FormDataEntryValue | null, max: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n < max ? n : 0;
};

// Étape 1 : lire le fichier pour proposer la correspondance des colonnes (rien n'est
// enregistré). Le navigateur calcule ensuite l'aperçu avec ces lignes.
export async function lireFichierEleves(formData: FormData): Promise<LectureFichier> {
  await exigerAdmin();
  const lu = await lireFichier(formData);
  if ("erreur" in lu) return { succes: false, message: lu.erreur };
  const feuille = numero(formData.get("feuille"), lu.feuilles.length);
  return { succes: true, feuilles: lu.feuilles.map((f) => f.nom), feuille, lignes: lu.feuilles[feuille].lignes };
}

// Étape 2 : relire le fichier et remplacer l'annuaire par les élèves qu'il contient.
export async function importerEleves(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  const session = await exigerAdmin();
  const lu = await lireFichier(formData);
  if ("erreur" in lu) return { succes: false, message: lu.erreur };

  const { lignes } = lu.feuilles[numero(formData.get("feuille"), lu.feuilles.length)];
  const ligneEnTetes = numero(formData.get("ligneEnTetes"), Math.max(1, lignes.length));
  let correspondance: Correspondance;
  try {
    const brute: unknown = JSON.parse(String(formData.get("correspondance") ?? "[]"));
    if (!Array.isArray(brute)) throw new Error();
    correspondance = brute.map((c) => (estCleChamp(c) ? c : null));
  } catch {
    return { succes: false, message: "Correspondance des colonnes illisible, rechargez la page." };
  }
  if (!correspondance.some((c) => c === "nom" || c === "nomComplet")) {
    return { succes: false, message: "Indiquez au moins la colonne du nom des élèves." };
  }

  const communes = (await db.commune.findMany({ select: { nom: true } })).map((c) => c.nom);
  const { eleves } = extraireEleves(lignes, ligneEnTetes, correspondance, communes);
  if (eleves.length === 0) return { succes: false, message: "Aucun élève trouvé avec ces colonnes." };

  const enTetes = lignes[ligneEnTetes] ?? [];
  await db.$transaction([
    db.eleveAnnuaire.deleteMany({}),
    db.eleveAnnuaire.createMany({ data: eleves }),
    db.importAnnuaireEleves.create({
      data: {
        nomFichier: lu.nomFichier.slice(0, 200),
        nbEleves: eleves.length,
        importePar: session.user.impersonation?.direction.nom ?? session.user.name ?? "",
        correspondance: correspondanceAMemoriser(enTetes, correspondance),
      },
    }),
  ]);

  revalidatePath("/annuaire/eleves");
  revalidatePath("/admin/annuaire-eleves");
  revalidatePath("/accueil");
  return { succes: true, message: `Annuaire mis à jour : ${eleves.length} élèves.` };
}
