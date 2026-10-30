"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { heureVersMinutes } from "@/lib/agenda";
import { anneeScolaireDebut } from "@/lib/fraisRecap";
import { lireMinutage, TYPES_EVENEMENT_SAISON } from "@/lib/saison";
import { supprimerOngletSaison, synchroniserAgendaSaison, synchroniserProgrammeHeureMusicale } from "@/lib/sheets";
import type { TypeEvenementSaison } from "@/generated/prisma/client";

export type EtatAction = { succes: boolean; message?: string };

const TYPES = TYPES_EVENEMENT_SAISON.map((t) => t.valeur) as readonly string[];

async function exigerAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") throw new Error("Accès réservé à la direction.");
  return session;
}

function champ(formData: FormData, nom: string) {
  return String(formData.get(nom) ?? "").trim() || null;
}

// Le classeur n'est qu'un reflet : une erreur Google ne doit jamais faire échouer la saisie.
async function synchroniser(evenementId: string | null, saisons: number[]) {
  try {
    if (evenementId) await synchroniserProgrammeHeureMusicale(evenementId);
    for (const s of [...new Set(saisons)]) await synchroniserAgendaSaison(s);
  } catch (erreur) {
    console.error("Échec de synchronisation Google Sheets (saison) :", erreur);
  }
}

export async function enregistrerEvenement(_etatPrecedent: EtatAction, formData: FormData): Promise<EtatAction> {
  await exigerAdmin();

  const id = champ(formData, "id");
  const type = String(formData.get("type") ?? "");
  const titre = champ(formData, "titre");
  const dateStr = champ(formData, "date");
  const heure = champ(formData, "heureDebut");
  const lieuId = champ(formData, "lieuId");
  const dureeMax = Number(formData.get("dureeMaxMinutes") || 0);

  if (!TYPES.includes(type)) return { succes: false, message: "Le type d'événement est requis." };
  if (!titre) return { succes: false, message: "Le titre est requis." };
  if (!dateStr) return { succes: false, message: "La date est requise." };
  const heureDebutMinutes = heure ? heureVersMinutes(heure) : null;
  if (heure && heureDebutMinutes === null) return { succes: false, message: "Heure invalide." };
  if (lieuId && !(await db.lieuPresence.findUnique({ where: { id: lieuId } }))) {
    return { succes: false, message: "Commune introuvable." };
  }

  const donnees = {
    type: type as TypeEvenementSaison,
    titre,
    date: new Date(`${dateStr}T00:00:00.000Z`),
    heureDebutMinutes,
    lieuId,
    lieuPrecis: champ(formData, "lieuPrecis"),
    description: champ(formData, "description"),
    dureeMaxMinutes: type === "HEURE_MUSICALE" && dureeMax > 0 ? dureeMax : null,
  };

  const avant = id ? await db.evenementSaison.findUnique({ where: { id } }) : null;
  if (id && !avant) return { succes: false, message: "Cet événement n'existe plus." };
  const evenement = avant
    ? await db.evenementSaison.update({ where: { id: avant.id }, data: donnees })
    : await db.evenementSaison.create({ data: donnees });

  const saisons = [anneeScolaireDebut(evenement.date), ...(avant ? [anneeScolaireDebut(avant.date)] : [])];
  revalidatePath("/saison");
  revalidatePath(`/saison/${evenement.id}`);
  await synchroniser(evenement.id, saisons);
  if (avant) redirect(`/saison?saison=${anneeScolaireDebut(evenement.date)}`);
  return { succes: true, message: "Événement ajouté." };
}

export async function supprimerEvenement(_etatPrecedent: EtatAction, formData: FormData): Promise<EtatAction> {
  await exigerAdmin();
  const evenement = await db.evenementSaison.findUnique({ where: { id: String(formData.get("id")) } });
  if (!evenement) return { succes: false, message: "Cet événement n'existe plus." };

  await db.evenementSaison.delete({ where: { id: evenement.id } }); // inscriptions supprimées avec
  revalidatePath("/saison");
  try {
    if (evenement.ongletSheetId !== null) await supprimerOngletSaison(evenement.ongletSheetId);
  } catch (erreur) {
    console.error("Échec de suppression de l'onglet d'heure musicale :", erreur);
  }
  await synchroniser(null, [anneeScolaireDebut(evenement.date)]);
  return { succes: true };
}

export async function ajouterInscription(_etatPrecedent: EtatAction, formData: FormData): Promise<EtatAction> {
  const session = await auth();
  if (!session?.user) return { succes: false, message: "Non connecté." };

  const evenementId = String(formData.get("evenementId") ?? "");
  const evenement = await db.evenementSaison.findUnique({ where: { id: evenementId } });
  if (!evenement || evenement.type !== "HEURE_MUSICALE") {
    return { succes: false, message: "Cette heure musicale n'existe plus." };
  }

  const eleveNom = champ(formData, "eleveNom");
  const instrument = champ(formData, "instrument");
  const programme = champ(formData, "programme");
  const minutageSecondes = lireMinutage(String(formData.get("minutage") ?? ""));
  if (!eleveNom) return { succes: false, message: "Le nom de l'élève est requis." };
  if (!instrument) return { succes: false, message: "L'instrument est requis." };
  if (!programme) return { succes: false, message: "Le programme est requis." };
  if (minutageSecondes === null) return { succes: false, message: "Minutage invalide (ex. 3'30)." };

  const contenu = {
    eleveNom,
    instrument,
    programme,
    minutageSecondes,
    materiel: champ(formData, "materiel"),
    commentaire: champ(formData, "commentaire"),
  };

  // Modification : seul le prof qui a inscrit l'élève (ou la direction) peut la faire ;
  // l'ordre de passage et l'auteur de l'inscription ne changent pas.
  const id = champ(formData, "id");
  if (id) {
    const existante = await db.inscriptionHeureMusicale.findUnique({ where: { id } });
    if (!existante || existante.evenementId !== evenementId) {
      return { succes: false, message: "Cette inscription n'existe plus." };
    }
    if (existante.profId !== session.user.id && session.user.role !== "ADMIN") {
      return { succes: false, message: "Vous ne pouvez modifier que vos propres inscriptions." };
    }
    await db.inscriptionHeureMusicale.update({ where: { id }, data: contenu });
  } else {
    const dernier = await db.inscriptionHeureMusicale.findFirst({
      where: { evenementId },
      orderBy: { ordre: "desc" },
    });
    await db.inscriptionHeureMusicale.create({
      data: { ...contenu, evenementId, profId: session.user.id, ordre: (dernier?.ordre ?? 0) + 1 },
    });
  }

  revalidatePath(`/saison/${evenementId}`);
  revalidatePath("/saison");
  await synchroniser(evenementId, [anneeScolaireDebut(evenement.date)]);
  // Sortie du mode modification une fois enregistré.
  if (id) redirect(`/saison/${evenementId}`);
  return { succes: true };
}

export async function supprimerInscription(_etatPrecedent: EtatAction, formData: FormData): Promise<EtatAction> {
  const session = await auth();
  if (!session?.user) return { succes: false, message: "Non connecté." };

  const inscription = await db.inscriptionHeureMusicale.findUnique({
    where: { id: String(formData.get("id")) },
    include: { evenement: true },
  });
  if (!inscription) return { succes: false, message: "Cette inscription n'existe plus." };
  if (inscription.profId !== session.user.id && session.user.role !== "ADMIN") {
    return { succes: false, message: "Action non autorisée." };
  }

  await db.inscriptionHeureMusicale.delete({ where: { id: inscription.id } });
  revalidatePath(`/saison/${inscription.evenementId}`);
  revalidatePath("/saison");
  await synchroniser(inscription.evenementId, [anneeScolaireDebut(inscription.evenement.date)]);
  return { succes: true };
}

// Ordre de passage : la direction fait monter ou descendre un élève d'un cran.
export async function deplacerInscription(formData: FormData) {
  await exigerAdmin();
  const inscription = await db.inscriptionHeureMusicale.findUnique({ where: { id: String(formData.get("id")) } });
  if (!inscription) return;

  const liste = await db.inscriptionHeureMusicale.findMany({
    where: { evenementId: inscription.evenementId },
    orderBy: [{ ordre: "asc" }, { creeLe: "asc" }],
  });
  const i = liste.findIndex((x) => x.id === inscription.id);
  const j = formData.get("sens") === "haut" ? i - 1 : i + 1;
  if (j < 0 || j >= liste.length) return;
  [liste[i], liste[j]] = [liste[j], liste[i]];
  // Renumérote toute la liste (1, 2, 3…) : robuste même si des ordres étaient en double.
  await db.$transaction(
    liste.map((x, n) => db.inscriptionHeureMusicale.update({ where: { id: x.id }, data: { ordre: n + 1 } }))
  );

  revalidatePath(`/saison/${inscription.evenementId}`);
  await synchroniser(inscription.evenementId, []);
}
