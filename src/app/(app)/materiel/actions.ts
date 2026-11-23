"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { urlBase } from "@/lib/url";
import { lireCentimes } from "@/lib/devis";
import { noterEchecMail } from "@/lib/echecsMail";
import { envoyerAlerteDirection, envoyerMailSuiteDemandeMateriel } from "@/lib/mail";
import { envoyerPush } from "@/lib/push";
import { synchroniserTableauMateriel } from "@/lib/demandesMaterielServeur";
import {
  DETAILS_MAX,
  INFOS_STATUT,
  INFOS_URGENCE,
  LIBELLE_MAX,
  lireLien,
  peutModifierDemande,
  QUANTITE_MAX,
  REPONSE_MAX,
  STATUTS,
  TITRE_MAX,
  URGENCES,
  type StatutDemande,
  type Urgence,
} from "@/lib/demandesMateriel";

export type EtatAction = { succes: boolean; message?: string };

async function connecte() {
  const session = await auth();
  if (!session?.user) throw new Error("Non connecté.");
  return session;
}

const champ = (fd: FormData, nom: string, max = 200) => String(fd.get(nom) ?? "").trim().slice(0, max);

function rafraichir() {
  revalidatePath("/materiel");
  revalidatePath("/admin/materiel");
  revalidatePath("/accueil");
  // Le tableau du Drive suit chaque changement, sans faire attendre celui qui enregistre.
  after(() => synchroniserTableauMateriel());
}

type Session = Awaited<ReturnType<typeof connecte>>;
const peutModifier = (session: Session, d: { auteurId: string | null; statut: StatutDemande }) => peutModifierDemande(session.user, d);
const refus = (session: Session, d: { auteurId: string | null }) =>
  session.user.impersonation
    ? "Impossible en mode « connecté en tant que » : seul le prof peut modifier sa demande."
    : d.auteurId !== session.user.id
      ? "Seule la personne qui a fait cette demande peut la modifier."
      : "Cette demande a déjà été décidée : voyez avec la direction.";

// Une proposition saisie : un lien, un prix ou une précision (au moins l'un des trois).
function lireProposition(lien: string, prix: string, libelle: string): { erreur: string } | { url: string | null; prixCentimes: number | null; libelle: string | null } | null {
  const texteLien = lien.trim();
  const textePrix = prix.trim();
  const texteLibelle = libelle.trim().slice(0, LIBELLE_MAX);
  if (!texteLien && !textePrix && !texteLibelle) return null;
  const url = texteLien ? lireLien(texteLien) : null;
  if (texteLien && !url) return { erreur: `Lien non reconnu : « ${texteLien.slice(0, 40)} ». Copiez l'adresse complète de la page.` };
  const prixCentimes = textePrix ? lireCentimes(textePrix) : null;
  if (textePrix && (prixCentimes === null || prixCentimes < 0)) return { erreur: `Prix non reconnu : « ${textePrix.slice(0, 12)} » (ex. 49,90).` };
  return { url, prixCentimes, libelle: texteLibelle || null };
}

// Une demande urgente prévient la direction par mail, en plus de la notification.
async function prevenirDirection(demande: { titre: string; urgence: Urgence; quantite: number }, auteur: { id: string; nom: string }, nouvelle: boolean) {
  const direction = await db.user.findMany({ where: { role: "ADMIN", actif: true, id: { not: auteur.id } }, select: { id: true } });
  const urgence = INFOS_URGENCE[demande.urgence].libelle;
  await envoyerPush(
    direction.map((d) => d.id),
    { titre: `Demande de matériel (${urgence.toLowerCase()})`, corps: `${auteur.nom} : ${demande.titre}`, url: "/admin/materiel" }
  ).catch((e) => console.error("Notification « demande de matériel » non envoyée :", e));
  if (demande.urgence !== "URGENTE") return;
  const objet = `Matériel urgent : ${demande.titre}`;
  try {
    await envoyerAlerteDirection({
      sujet: objet,
      titre: "Demande de matériel urgente",
      texte: `${auteur.nom} ${nouvelle ? "demande" : "signale comme urgent"} : ${demande.titre}${demande.quantite > 1 ? ` (× ${demande.quantite})` : ""}.`,
      url: `${await urlBase()}/admin/materiel`,
      libelleBouton: "Voir la demande",
    });
  } catch (erreur) {
    await noterEchecMail({ destinataire: "direction", objet, detail: `Demande de ${auteur.nom}` }, erreur);
  }
}

// Création ou correction d'une demande, avec ses propositions à la création.
export async function enregistrerDemandeMateriel(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  const session = await connecte();
  const titre = champ(fd, "titre", TITRE_MAX);
  if (!titre) return { succes: false, message: "Indiquez le matériel demandé." };
  const quantite = Number(champ(fd, "quantite", 4) || "1");
  if (!Number.isInteger(quantite) || quantite < 1 || quantite > QUANTITE_MAX) return { succes: false, message: "Quantité invalide." };
  const urgenceLue = champ(fd, "urgence", 10) as Urgence;
  if (!URGENCES.includes(urgenceLue)) return { succes: false, message: "Choisissez le niveau d'urgence." };
  const donnees = { titre, quantite, urgence: urgenceLue, details: champ(fd, "details", DETAILS_MAX) || null };

  const id = champ(fd, "id", 40);
  if (id) {
    const avant = await db.demandeMateriel.findUnique({ where: { id }, select: { auteurId: true, statut: true, urgence: true } });
    if (!avant) return { succes: false, message: "Cette demande n'existe plus." };
    if (!peutModifier(session, avant)) return { succes: false, message: refus(session, avant) };
    await db.demandeMateriel.update({ where: { id }, data: donnees });
    if (urgenceLue === "URGENTE" && avant.urgence !== "URGENTE") {
      await prevenirDirection(donnees, { id: session.user.id, nom: session.user.name ?? "Un prof" }, false);
    }
    rafraichir();
    return { succes: true, message: "Demande modifiée." };
  }

  if (session.user.impersonation) return { succes: false, message: "Impossible en mode « connecté en tant que » : le prof fait sa demande lui-même." };
  const liens = fd.getAll("pLien").map(String);
  const prix = fd.getAll("pPrix").map(String);
  const libelles = fd.getAll("pLibelle").map(String);
  const propositions: { url: string | null; prixCentimes: number | null; libelle: string | null; auteurId: string }[] = [];
  for (let i = 0; i < Math.min(liens.length, 10); i++) {
    const p = lireProposition(liens[i] ?? "", prix[i] ?? "", libelles[i] ?? "");
    if (!p) continue;
    if ("erreur" in p) return { succes: false, message: p.erreur };
    propositions.push({ ...p, auteurId: session.user.id });
  }
  await db.demandeMateriel.create({ data: { ...donnees, auteurId: session.user.id, propositions: { create: propositions } } });
  await prevenirDirection(donnees, { id: session.user.id, nom: session.user.name ?? "Un prof" }, true);
  rafraichir();
  return { succes: true, message: donnees.urgence === "URGENTE" ? "Demande envoyée : la direction est prévenue de l'urgence." : "Demande envoyée à la direction." };
}

// Ajout ou correction d'une proposition (lien, prix, précision).
export async function enregistrerProposition(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  const session = await connecte();
  const demande = await db.demandeMateriel.findUnique({ where: { id: champ(fd, "demandeId", 40) }, select: { id: true, auteurId: true, statut: true } });
  if (!demande) return { succes: false, message: "Cette demande n'existe plus." };
  if (!peutModifier(session, demande)) return { succes: false, message: refus(session, demande) };
  const p = lireProposition(String(fd.get("lien") ?? ""), String(fd.get("prix") ?? ""), String(fd.get("libelle") ?? ""));
  if (!p) return { succes: false, message: "Indiquez un lien, un prix ou une précision." };
  if ("erreur" in p) return { succes: false, message: p.erreur };
  const id = champ(fd, "id", 40);
  if (id) {
    const { count } = await db.propositionMateriel.updateMany({ where: { id, demandeId: demande.id }, data: p });
    if (count === 0) return { succes: false, message: "Cette proposition n'existe plus." };
  } else {
    if ((await db.propositionMateriel.count({ where: { demandeId: demande.id } })) >= 20) return { succes: false, message: "20 propositions au maximum." };
    await db.propositionMateriel.create({ data: { ...p, demandeId: demande.id, auteurId: session.user.id } });
  }
  rafraichir();
  return { succes: true, message: id ? "Proposition modifiée." : "Proposition ajoutée." };
}

export async function supprimerProposition(fd: FormData) {
  const session = await connecte();
  const p = await db.propositionMateriel.findUnique({ where: { id: champ(fd, "id", 40) }, include: { demande: { select: { auteurId: true, statut: true } } } });
  if (!p || !peutModifier(session, p.demande)) return;
  await db.propositionMateriel.delete({ where: { id: p.id } });
  rafraichir();
}

// Seul l'auteur retire sa demande, tant que rien n'est décidé (la direction peut la refuser).
export async function retirerDemandeMateriel(fd: FormData) {
  const session = await connecte();
  const d = await db.demandeMateriel.findUnique({ where: { id: champ(fd, "id", 40) }, select: { id: true, auteurId: true, statut: true } });
  if (!d || !peutModifier(session, d)) return;
  await db.demandeMateriel.delete({ where: { id: d.id } });
  rafraichir();
}

// --- Direction ---

// Retenir (ou ne plus retenir) une proposition : une seule par demande.
export async function retenirProposition(fd: FormData) {
  const session = await connecte();
  if (session.user.role !== "ADMIN") throw new Error("Accès réservé à la direction.");
  const p = await db.propositionMateriel.findUnique({ where: { id: champ(fd, "id", 40) }, select: { id: true, demandeId: true, retenue: true } });
  if (!p) return;
  await db.$transaction([
    db.propositionMateriel.updateMany({ where: { demandeId: p.demandeId }, data: { retenue: false } }),
    ...(p.retenue ? [] : [db.propositionMateriel.update({ where: { id: p.id }, data: { retenue: true } })]),
  ]);
  rafraichir();
}

// Statut et réponse ; le prof est prévenu si la case est cochée.
export async function traiterDemandeMateriel(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  const session = await connecte();
  if (session.user.role !== "ADMIN") return { succes: false, message: "Accès réservé à la direction." };
  const d = await db.demandeMateriel.findUnique({ where: { id: champ(fd, "id", 40) }, include: { auteur: { select: { id: true, prenom: true, email: true } } } });
  if (!d) return { succes: false, message: "Cette demande n'existe plus." };
  const statutLu = champ(fd, "statut", 12) as StatutDemande;
  if (!STATUTS.includes(statutLu)) return { succes: false, message: "Statut invalide." };
  const reponse = champ(fd, "reponse", REPONSE_MAX) || null;
  if (statutLu === d.statut && reponse === d.reponse) return { succes: true, message: "Rien n'a changé." };
  await db.demandeMateriel.update({
    where: { id: d.id },
    data: { statut: statutLu, reponse, reponduLe: reponse !== d.reponse ? (reponse ? new Date() : null) : d.reponduLe },
  });

  let suite = "";
  if (d.auteur && d.auteur.id !== session.user.id && fd.get("prevenir") === "on") {
    const statut = INFOS_STATUT[statutLu].libelle.toLowerCase();
    try {
      await envoyerMailSuiteDemandeMateriel({ prof: d.auteur, titre: d.titre, statut, reponse, url: `${await urlBase()}/materiel` });
      suite = ` Mail envoyé à ${d.auteur.prenom}.`;
    } catch (erreur) {
      await noterEchecMail({ destinataire: d.auteur.email, objet: `Demande de matériel : ${d.titre}`, detail: `Statut : ${statut}` }, erreur);
      suite = " Le mail au prof n'a pas pu partir.";
    }
    await envoyerPush([d.auteur.id], { titre: "Demande de matériel", corps: `« ${d.titre} » : ${statut}`, url: "/materiel" }).catch(() => 0);
  }
  rafraichir();
  return { succes: true, message: `Enregistré.${suite}` };
}

// Mise à jour du tableau du Drive à la demande (après une panne de connexion Google).
export async function mettreAJourTableauMateriel(): Promise<EtatAction> {
  const session = await connecte();
  if (session.user.role !== "ADMIN") return { succes: false, message: "Accès réservé à la direction." };
  const ok = await synchroniserTableauMateriel();
  revalidatePath("/admin/materiel");
  return ok ? { succes: true, message: "Tableau à jour." } : { succes: false, message: "Le Drive n'a pas répondu : vérifiez la connexion Google dans Paramètres." };
}
