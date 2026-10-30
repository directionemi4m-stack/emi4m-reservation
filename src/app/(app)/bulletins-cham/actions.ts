"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lireSignature, MATIERES_CHAM, periodeCourante, type MatiereCham } from "@/lib/bulletinsCham";
import { compilerBulletin } from "@/lib/bulletinsChamServeur";

export type EtatAction = { succes: boolean; message?: string };

const MATIERES = MATIERES_CHAM.map((m) => m.valeur) as readonly string[];
const TEXTE_MAX = 2000;

function champ(formData: FormData, nom: string) {
  return String(formData.get(nom) ?? "").trim();
}

async function session() {
  const s = await auth();
  if (!s?.user) throw new Error("Non connecté.");
  return s;
}

// Une signature engage la personne qui signe : impossible en mode « connecté en tant que ».
function refusSiImpersonation(s: Awaited<ReturnType<typeof session>>): EtatAction | null {
  return s.user.impersonation
    ? { succes: false, message: "Signature impossible en mode « connecté en tant que » : seul le prof peut signer." }
    : null;
}

// Trimestre visé : celui de l'année scolaire en cours (ou de la précédente, pour un
// rattrapage en septembre).
function lirePeriode(formData: FormData): { anneeDebut: number; trimestre: number } | null {
  const anneeDebut = Number(formData.get("anneeDebut"));
  const trimestre = Number(formData.get("trimestre"));
  const courante = periodeCourante(new Date()).anneeDebut;
  if (![1, 2, 3].includes(trimestre)) return null;
  if (anneeDebut !== courante && anneeDebut !== courante - 1) return null;
  return { anneeDebut, trimestre };
}

async function recompiler(eleveId: string, anneeDebut: number, trimestre: number): Promise<string | undefined> {
  try {
    const bulletin = await compilerBulletin(eleveId, anneeDebut, trimestre);
    return bulletin ? undefined : "Enregistré, mais le PDF n'a pas pu être déposé dans le Drive (connexion Google à vérifier).";
  } catch (erreur) {
    console.error("Compilation du bulletin CHAM impossible :", erreur);
    return "Enregistré, mais le PDF n'a pas pu être mis à jour dans le Drive. Il le sera à la prochaine signature.";
  }
}

export async function ajouterSuivi(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  const s = await session();
  const eleveId = champ(formData, "eleveId");
  const matiere = champ(formData, "matiere");
  const precision = champ(formData, "precision").slice(0, 60) || null;

  if (!eleveId) return { succes: false, message: "Choisissez un élève." };
  if (!MATIERES.includes(matiere)) return { succes: false, message: "Choisissez une rubrique." };
  if (!(await db.eleveCham.findUnique({ where: { id: eleveId }, select: { id: true } }))) {
    return { succes: false, message: "Élève introuvable." };
  }

  await db.suiviCham.upsert({
    where: { eleveId_profId_matiere: { eleveId, profId: s.user.id, matiere: matiere as MatiereCham } },
    create: { eleveId, profId: s.user.id, matiere: matiere as MatiereCham, precision },
    update: { precision },
  });
  revalidatePath("/bulletins-cham");
  return { succes: true, message: "Élève ajouté." };
}

export async function retirerSuivi(formData: FormData) {
  const s = await session();
  await db.suiviCham.deleteMany({ where: { id: String(formData.get("id")), profId: s.user.id } });
  revalidatePath("/bulletins-cham");
}

export async function signerAppreciation(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  const s = await session();
  const refus = refusSiImpersonation(s);
  if (refus) return refus;

  const periode = lirePeriode(formData);
  if (!periode) return { succes: false, message: "Trimestre invalide." };
  const eleveId = champ(formData, "eleveId");
  const matiere = champ(formData, "matiere") as MatiereCham;
  const texte = champ(formData, "texte");
  const signature = lireSignature(champ(formData, "signature"));

  const suivi = await db.suiviCham.findUnique({
    where: { eleveId_profId_matiere: { eleveId, profId: s.user.id, matiere } },
  });
  if (!suivi) return { succes: false, message: "Vous ne suivez pas cet élève dans cette rubrique." };
  if (!texte) return { succes: false, message: "L'appréciation est vide." };
  if (texte.length > TEXTE_MAX) return { succes: false, message: `Appréciation trop longue (${TEXTE_MAX} caractères au plus).` };
  if (!signature) return { succes: false, message: "Signez dans le cadre avant d'enregistrer." };

  const cle = { eleveId, profId: s.user.id, matiere, ...periode };
  const donnees = { texte, signature: new Uint8Array(signature), signeLe: new Date(), precision: suivi.precision };
  await db.appreciationCham.upsert({
    where: { eleveId_profId_matiere_anneeDebut_trimestre: cle },
    create: { ...cle, ...donnees },
    update: donnees,
  });
  await db.signatureBulletin.upsert({
    where: { userId: s.user.id },
    create: { userId: s.user.id, image: new Uint8Array(signature) },
    update: { image: new Uint8Array(signature) },
  });

  const avertissement = await recompiler(eleveId, periode.anneeDebut, periode.trimestre);
  revalidatePath("/bulletins-cham");
  revalidatePath(`/bulletins-cham/${eleveId}`);
  return { succes: true, message: avertissement ?? "Appréciation signée et bulletin mis à jour." };
}

export async function signerBilan(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  const s = await session();
  if (s.user.role !== "ADMIN") return { succes: false, message: "Réservé à la direction." };
  const refus = refusSiImpersonation(s);
  if (refus) return refus;

  const periode = lirePeriode(formData);
  if (!periode) return { succes: false, message: "Trimestre invalide." };
  const eleveId = champ(formData, "eleveId");
  const bilan = champ(formData, "bilan");
  const signature = lireSignature(champ(formData, "signature"));

  if (!(await db.eleveCham.findUnique({ where: { id: eleveId }, select: { id: true } }))) {
    return { succes: false, message: "Élève introuvable." };
  }
  if (bilan.length > TEXTE_MAX) return { succes: false, message: `Bilan trop long (${TEXTE_MAX} caractères au plus).` };
  if (!signature) return { succes: false, message: "Signez dans le cadre avant d'enregistrer." };

  const donnees = {
    bilan: bilan || null,
    signatureDirection: new Uint8Array(signature),
    directionId: s.user.id,
    signeDirectionLe: new Date(),
  };
  await db.bulletinCham.upsert({
    where: { eleveId_anneeDebut_trimestre: { eleveId, ...periode } },
    create: { eleveId, ...periode, ...donnees },
    update: donnees,
  });
  await db.signatureBulletin.upsert({
    where: { userId: s.user.id },
    create: { userId: s.user.id, image: new Uint8Array(signature) },
    update: { image: new Uint8Array(signature) },
  });

  const avertissement = await recompiler(eleveId, periode.anneeDebut, periode.trimestre);
  revalidatePath("/bulletins-cham");
  revalidatePath(`/bulletins-cham/${eleveId}`);
  return { succes: true, message: avertissement ?? "Bilan signé et bulletin mis à jour." };
}

export async function recompilerBulletin(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  const s = await session();
  if (s.user.role !== "ADMIN") return { succes: false, message: "Réservé à la direction." };
  const periode = lirePeriode(formData);
  if (!periode) return { succes: false, message: "Trimestre invalide." };
  const eleveId = champ(formData, "eleveId");
  const avertissement = await recompiler(eleveId, periode.anneeDebut, periode.trimestre);
  revalidatePath(`/bulletins-cham/${eleveId}`);
  return avertissement ? { succes: false, message: avertissement.replace("Enregistré, mais l", "L") } : { succes: true, message: "PDF mis à jour dans le Drive." };
}
