import { after } from "next/server";
import { db } from "@/lib/db";
import { ecrireRegistreConventions } from "@/lib/drive";
import { aujourdHuiUTC, LIBELLES_RESERVATION, salleDuLieu } from "@/lib/conventions";
import { minutesVersHeure } from "@/lib/agenda";

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

// --- Événements de l'agenda de la saison (concert à La Verrière…) ---

async function sallesAConvention() {
  return (await db.salle.findMany({ where: { conventionRequise: true }, include: { commune: true } })).map((s) => ({
    nom: s.nom,
    commune: s.commune.nom,
  }));
}

// L'événement recopié sur la convention : la salle reconnue (sinon le lieu saisi), la date,
// l'heure, et le titre de l'événement à la place du prof.
function copieEvenement(
  e: { titre: string; date: Date; heureDebutMinutes: number | null; lieuPrecis: string | null; lieu: { nom: string } | null },
  salle: { nom: string; commune: string } | null
) {
  return {
    salle: salle?.nom ?? e.lieuPrecis ?? "Lieu à préciser",
    commune: salle?.commune ?? e.lieu?.nom ?? "",
    date: e.date,
    horaire: e.heureDebutMinutes !== null ? minutesVersHeure(e.heureDebutMinutes, ":") : "",
    prof: `Agenda : ${e.titre}`,
  };
}

// Fiche convention d'un événement de l'agenda : créée d'office si l'événement a lieu dans
// une salle à convention, ou à la demande (forcer) pour un autre lieu ; null sinon.
export async function assurerConventionEvenement(evenementId: string, { forcer = false } = {}) {
  const e = await db.evenementSaison.findUnique({ where: { id: evenementId }, include: { lieu: true, convention: true } });
  if (!e) return null;
  const salle = salleDuLieu(e.lieuPrecis, e.lieu?.nom ?? null, await sallesAConvention());
  if (!e.convention && !salle && !forcer) return null;
  return db.conventionSalle.upsert({
    where: { evenementSaisonId: evenementId },
    create: { evenementSaisonId: evenementId, ...copieEvenement(e, salle) },
    update: copieEvenement(e, salle),
  });
}

// Après l'ajout ou la modification d'un événement de l'agenda.
export async function suivreEvenement(evenementId: string) {
  try {
    const c = await assurerConventionEvenement(evenementId);
    if (c) after(regenererRegistreSansErreur);
  } catch (erreur) {
    console.error("Mise à jour de la convention de l'événement impossible :", erreur);
  }
}

// Les événements à venir de l'agenda qui ont lieu dans une salle à convention.
export async function evenementsAConvention() {
  const [evenements, salles] = await Promise.all([
    db.evenementSaison.findMany({ where: { date: { gte: aujourdHuiUTC() } }, include: { lieu: true, convention: true } }),
    sallesAConvention(),
  ]);
  return evenements.filter((e) => e.convention || salleDuLieu(e.lieuPrecis, e.lieu?.nom ?? null, salles));
}

export async function regenererRegistreConventions() {
  for (const e of await evenementsAConvention()) if (!e.convention) await assurerConventionEvenement(e.id);

  // Les réservations à venir de ces salles figurent au registre même avant toute démarche.
  const oubliees = await db.demandeCreneau.findMany({
    where: { statut: { in: ["EN_ATTENTE", "VALIDEE"] }, date: { gte: aujourdHuiUTC() }, salle: { conventionRequise: true }, convention: { is: null } },
    select: { id: true },
  });
  for (const l of oubliees) await assurerConvention(l.id);

  const conventions = await db.conventionSalle.findMany({
    orderBy: [{ date: "asc" }, { horaire: "asc" }],
    include: { demandeCreneau: { select: { statut: true } }, evenementSaison: { select: { id: true } } },
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
      reservation: c.demandeCreneau
        ? LIBELLES_RESERVATION[c.demandeCreneau.statut]
        : c.evenementSaison
          ? "Agenda de la saison"
          : "Supprimée",
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
