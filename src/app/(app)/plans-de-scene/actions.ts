"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DIMENSION_MAX, DIMENSION_MIN, lireElements } from "@/lib/plansScene";
import { creerPlan } from "@/lib/plansSceneServeur";

export type EtatAction = { succes: boolean; message?: string };

async function connecte() {
  const session = await auth();
  if (!session?.user) throw new Error("Non connecté.");
  return session;
}
async function direction() {
  const session = await connecte();
  if (session.user.role !== "ADMIN") throw new Error("Accès réservé à la direction.");
  return session;
}

const champ = (fd: FormData, nom: string, max = 120) => String(fd.get(nom) ?? "").trim().slice(0, max);
const idOuNull = (fd: FormData, nom: string) => champ(fd, nom, 40) || null;
const dimension = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= DIMENSION_MIN && n <= DIMENSION_MAX ? n : null;
};

// --- Plans ---

export async function nouveauPlan(fd: FormData) {
  const session = await connecte();
  const plan = await creerPlan({
    evenementId: idOuNull(fd, "evenementId"),
    inscriptionId: idOuNull(fd, "inscriptionId"),
    classeId: idOuNull(fd, "classeId"),
    modele: fd.get("modele") === "1",
    source: champ(fd, "source", 40) || "vide",
    sceneId: idOuNull(fd, "sceneId"),
    titre: champ(fd, "titre") || null,
    auteurId: session.user.id,
  });
  if (plan.evenementId) revalidatePath(`/saison/${plan.evenementId}`);
  revalidatePath("/plans-de-scene");
  redirect(`/plans-de-scene/${plan.id}`);
}

export interface DonneesPlan {
  titre: string;
  notes: string;
  largeurCm: number;
  profondeurCm: number;
  sceneId: string | null;
  classeId: string | null;
  elements: unknown;
}

// Enregistrement automatique depuis l'éditeur (appelé quelques instants après chaque geste).
export async function sauverPlan(id: string, d: DonneesPlan): Promise<{ ok: boolean; message?: string }> {
  await connecte();
  const largeurCm = dimension(d.largeurCm);
  const profondeurCm = dimension(d.profondeurCm);
  if (!largeurCm || !profondeurCm) return { ok: false, message: "Dimensions de la scène invalides." };
  const plan = await db.planScene.findUnique({ where: { id }, select: { id: true, evenementId: true } });
  if (!plan) return { ok: false, message: "Ce plan n'existe plus." };
  const [scene, classe] = await Promise.all([
    d.sceneId ? db.sceneConcert.findUnique({ where: { id: d.sceneId }, select: { id: true } }) : null,
    d.classeId ? db.classe.findUnique({ where: { id: d.classeId }, select: { id: true } }) : null,
  ]);
  await db.planScene.update({
    where: { id },
    data: {
      titre: String(d.titre ?? "").trim().slice(0, 120) || "Plan sans titre",
      notes: String(d.notes ?? "").trim().slice(0, 2000) || null,
      largeurCm,
      profondeurCm,
      sceneId: scene?.id ?? null,
      classeId: classe?.id ?? null,
      elements: lireElements(d.elements) as unknown as object[],
    },
  });
  if (plan.evenementId) revalidatePath(`/saison/${plan.evenementId}`);
  return { ok: true };
}

export async function dupliquerPlan(fd: FormData) {
  const session = await connecte();
  const p = await db.planScene.findUnique({ where: { id: champ(fd, "id", 40) } });
  if (!p) return;
  const copie = await db.planScene.create({
    data: {
      titre: `${p.titre} (copie)`.slice(0, 120),
      sceneId: p.sceneId,
      largeurCm: p.largeurCm,
      profondeurCm: p.profondeurCm,
      elements: lireElements(p.elements) as unknown as object[],
      notes: p.notes,
      evenementId: p.evenementId,
      ordre: p.ordre,
      classeId: p.classeId,
      modele: p.modele,
      auteurId: session.user.id,
    },
  });
  redirect(`/plans-de-scene/${copie.id}`);
}

// Garder ce plan comme formation type de son ensemble, réutilisable pour les prochains concerts.
export async function garderCommeFormation(fd: FormData) {
  const session = await connecte();
  const p = await db.planScene.findUnique({ where: { id: champ(fd, "id", 40) } });
  if (!p) return;
  const titre = champ(fd, "titre") || p.titre;
  const formation = await db.planScene.create({
    data: {
      titre,
      sceneId: null,
      largeurCm: p.largeurCm,
      profondeurCm: p.profondeurCm,
      elements: lireElements(p.elements).filter((e) => !e.fixe) as unknown as object[],
      notes: p.notes,
      classeId: idOuNull(fd, "classeId") ?? p.classeId,
      modele: true,
      auteurId: session.user.id,
    },
  });
  revalidatePath("/plans-de-scene");
  redirect(`/plans-de-scene/${formation.id}`);
}

export async function supprimerPlan(fd: FormData) {
  const session = await connecte();
  const p = await db.planScene.findUnique({ where: { id: champ(fd, "id", 40) }, select: { id: true, auteurId: true, evenementId: true } });
  if (!p) return;
  if (session.user.role !== "ADMIN" && p.auteurId && p.auteurId !== session.user.id) throw new Error("Seul l'auteur du plan ou la direction peut le supprimer.");
  await db.planScene.delete({ where: { id: p.id } });
  revalidatePath("/plans-de-scene");
  if (p.evenementId) {
    revalidatePath(`/saison/${p.evenementId}`);
    redirect(`/saison/${p.evenementId}#plans`);
  }
  redirect("/plans-de-scene");
}

// La scène d'un concert : reprise par chaque nouveau passage.
export async function choisirSceneConcert(fd: FormData) {
  await connecte();
  const evenementId = champ(fd, "evenementId", 40);
  const sceneId = idOuNull(fd, "sceneId");
  await db.evenementSaison.update({ where: { id: evenementId }, data: { sceneId } });
  revalidatePath(`/saison/${evenementId}`);
}

// Ordre d'un plan libre dans la conduite (les passages d'élèves suivent l'ordre du programme).
export async function deplacerPlan(fd: FormData) {
  await connecte();
  const p = await db.planScene.findUnique({ where: { id: champ(fd, "id", 40) }, select: { id: true, ordre: true, evenementId: true } });
  if (!p?.evenementId) return;
  const delta = fd.get("sens") === "haut" ? -1 : 1;
  await db.planScene.update({ where: { id: p.id }, data: { ordre: Math.max(0, p.ordre + delta) } });
  revalidatePath(`/saison/${p.evenementId}`);
}

// --- Scènes (direction) ---

export async function nouvelleScene(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await direction();
  const nom = champ(fd, "nom");
  const largeurCm = dimension(Number(champ(fd, "largeur", 10).replace(",", ".")) * 100);
  const profondeurCm = dimension(Number(champ(fd, "profondeur", 10).replace(",", ".")) * 100);
  if (!nom) return { succes: false, message: "Donnez un nom à la scène." };
  if (!largeurCm || !profondeurCm) return { succes: false, message: "Indiquez la largeur et la profondeur en mètres (ex. 8,5)." };
  if (await db.sceneConcert.findUnique({ where: { nom } })) return { succes: false, message: "Une scène porte déjà ce nom." };
  const s = await db.sceneConcert.create({ data: { nom, largeurCm, profondeurCm, lieuId: idOuNull(fd, "lieuId"), notes: champ(fd, "notes", 1000) || null } });
  revalidatePath("/plans-de-scene");
  redirect(`/plans-de-scene/scenes/${s.id}`);
}

export async function sauverScene(id: string, d: { nom: string; notes: string; largeurCm: number; profondeurCm: number; lieuId: string | null; elements: unknown }): Promise<{ ok: boolean; message?: string }> {
  await direction();
  const largeurCm = dimension(d.largeurCm);
  const profondeurCm = dimension(d.profondeurCm);
  const nom = String(d.nom ?? "").trim().slice(0, 120);
  if (!nom) return { ok: false, message: "Donnez un nom à la scène." };
  if (!largeurCm || !profondeurCm) return { ok: false, message: "Dimensions invalides." };
  const doublon = await db.sceneConcert.findFirst({ where: { nom, id: { not: id } }, select: { id: true } });
  if (doublon) return { ok: false, message: "Une autre scène porte déjà ce nom." };
  const lieu = d.lieuId ? await db.lieuPresence.findUnique({ where: { id: d.lieuId }, select: { id: true } }) : null;
  await db.sceneConcert.update({
    where: { id },
    data: {
      nom,
      notes: String(d.notes ?? "").trim().slice(0, 1000) || null,
      largeurCm,
      profondeurCm,
      lieuId: lieu?.id ?? null,
      elements: lireElements(d.elements).map((e) => ({ ...e, fixe: false })) as unknown as object[],
    },
  });
  revalidatePath("/plans-de-scene");
  return { ok: true };
}

export async function supprimerScene(fd: FormData) {
  await direction();
  await db.sceneConcert.update({ where: { id: champ(fd, "id", 40) }, data: { actif: false } });
  revalidatePath("/plans-de-scene");
  redirect("/plans-de-scene");
}

// --- Catalogue (direction) ---

const CATEGORIES = ["MUSICIEN", "MOBILIER", "MATERIEL", "DECOR"] as const;

export async function enregistrerElementCatalogue(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await direction();
  const nom = champ(fd, "nom", 80);
  const categorie = champ(fd, "categorie", 10) as (typeof CATEGORIES)[number];
  const largeurCm = dimension(champ(fd, "largeur", 6));
  const profondeurCm = dimension(champ(fd, "profondeur", 6));
  const couleur = /^#[0-9a-fA-F]{6}$/.test(champ(fd, "couleur", 7)) ? champ(fd, "couleur", 7) : "#64748b";
  if (!nom) return { succes: false, message: "Donnez un nom." };
  if (!CATEGORIES.includes(categorie)) return { succes: false, message: "Catégorie invalide." };
  if (!largeurCm || !profondeurCm || largeurCm > 2000 || profondeurCm > 2000) return { succes: false, message: "Largeur et profondeur en centimètres (10 à 2000)." };
  const donnees = {
    nom,
    categorie,
    largeurCm,
    profondeurCm,
    forme: fd.get("forme") === "ROND" ? ("ROND" as const) : ("RECT" as const),
    couleur,
    abrege: champ(fd, "abrege", 12) || null,
    chaise: fd.get("chaise") === "on",
    pupitre: fd.get("pupitre") === "on",
    motsCles: champ(fd, "motsCles", 200) || null,
  };
  const id = champ(fd, "id", 40);
  const doublon = await db.elementScene.findFirst({ where: { nom, ...(id ? { id: { not: id } } : {}) }, select: { id: true } });
  if (doublon) return { succes: false, message: "Un élément porte déjà ce nom." };
  if (id) await db.elementScene.update({ where: { id }, data: donnees });
  else await db.elementScene.create({ data: { ...donnees, ordre: 999 } });
  revalidatePath("/plans-de-scene/catalogue");
  return { succes: true, message: id ? "Modifié." : "Ajouté au catalogue." };
}

export async function retirerElementCatalogue(fd: FormData) {
  await direction();
  await db.elementScene.update({ where: { id: champ(fd, "id", 40) }, data: { actif: false } });
  revalidatePath("/plans-de-scene/catalogue");
}
