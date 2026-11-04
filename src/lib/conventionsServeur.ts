import { after } from "next/server";
import { db } from "@/lib/db";
import { ecrireRegistreConventions } from "@/lib/drive";
import { aujourdHuiUTC, LIBELLES_RESERVATION } from "@/lib/conventions";

const heure = (d: Date) => d.toISOString().slice(11, 16);

async function ligneAvecSalle(demandeCreneauId: string) {
  return db.demandeCreneau.findUnique({
    where: { id: demandeCreneauId },
    include: { salle: { include: { commune: true } }, demande: { include: { prof: true } }, convention: true },
  });
}

// La réservation recopiée sur la convention (cf. schéma) : salle, date, horaire, prof.
function copie(ligne: NonNullable<Awaited<ReturnType<typeof ligneAvecSalle>>>) {
  return {
    salle: ligne.salle.nom,
    commune: ligne.salle.commune.nom,
    date: ligne.date,
    horaire: `${heure(ligne.heureDebut)}–${heure(ligne.heureFin)}`,
    prof: `${ligne.demande.prof.prenom} ${ligne.demande.prof.nom}`,
  };
}

// Crée la fiche convention d'une réservation de salle « à convention » (ou met à jour sa
// copie de la réservation) ; null si la salle n'en demande pas.
export async function assurerConvention(demandeCreneauId: string, maj: { demandeMairieLe?: Date } = {}) {
  const ligne = await ligneAvecSalle(demandeCreneauId);
  if (!ligne) return null;
  if (!ligne.convention && !ligne.salle.conventionRequise) return null;
  return db.conventionSalle.upsert({
    where: { demandeCreneauId },
    create: { demandeCreneauId, ...copie(ligne), demandeMairieLe: maj.demandeMairieLe ?? null },
    update: { ...copie(ligne), ...(maj.demandeMairieLe && !ligne.convention?.demandeMairieLe ? { demandeMairieLe: maj.demandeMairieLe } : {}) },
  });
}

// Après l'envoi de la « Demande à la mairie » depuis l'appli : la date de demande est notée.
export async function noterDemandeMairie(demandeCreneauId: string) {
  try {
    const c = await assurerConvention(demandeCreneauId, { demandeMairieLe: aujourdHuiUTC() });
    if (c) after(regenererRegistreSansErreur);
  } catch (erreur) {
    console.error("Date de demande à la mairie non notée :", erreur);
  }
}

// Après une décision sur la réservation (validée, refusée, annulée, modifiée) : la fiche
// convention suit, et le registre du Drive est réécrit une fois la réponse envoyée (sans
// faire attendre la direction ni bloquer l'action en cas d'échec Drive).
export async function suivreReservation(demandeCreneauId: string) {
  try {
    const c = await assurerConvention(demandeCreneauId);
    if (c) after(regenererRegistreSansErreur);
  } catch (erreur) {
    console.error("Mise à jour de la convention impossible :", erreur);
  }
}

export async function regenererRegistreConventions() {
  // Les réservations à venir de ces salles figurent au registre même avant toute démarche.
  const oubliees = await db.demandeCreneau.findMany({
    where: { statut: { in: ["EN_ATTENTE", "VALIDEE"] }, date: { gte: aujourdHuiUTC() }, salle: { conventionRequise: true }, convention: { is: null } },
    select: { id: true },
  });
  for (const l of oubliees) await assurerConvention(l.id);

  const conventions = await db.conventionSalle.findMany({
    orderBy: [{ date: "asc" }, { horaire: "asc" }],
    include: { demandeCreneau: { select: { statut: true } } },
  });
  return ecrireRegistreConventions(
    conventions.map((c) => ({
      date: c.date,
      horaire: c.horaire,
      salle: c.salle,
      commune: c.commune,
      prof: c.prof,
      demandeMairieLe: c.demandeMairieLe,
      reponseMairieLe: c.reponseMairieLe,
      reservation: c.demandeCreneau ? LIBELLES_RESERVATION[c.demandeCreneau.statut] : "Supprimée",
      conventionUrl: c.fichierUrl,
      commentaire: c.commentaire,
    }))
  );
}

export async function regenererRegistreSansErreur() {
  try {
    await regenererRegistreConventions();
  } catch (erreur) {
    console.error("Registre des conventions non mis à jour :", erreur);
  }
}
