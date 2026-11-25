import { db } from "@/lib/db";
import { deposerFacture } from "@/lib/drive";
import { nomFichierFacture } from "@/lib/factures";
import { envoyerMailConvocationVisite } from "@/lib/mail";
import { envoyerPush } from "@/lib/push";
import { salariesDuRegistre } from "@/lib/clesServeur";
import { calculerSuivi, dateLongue, LIBELLE_TYPE_VISITE, ORDRE_ETAT, type Suivi } from "@/lib/santeTravail";

export function aujourdHuiUTC() {
  const t = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
  return new Date(`${t}T00:00:00.000Z`);
}

// Tout sauf les PDF, lourds : « aPdf » dit seulement s'il y en a un.
export const champsVisite = {
  id: true,
  type: true,
  statut: true,
  date: true,
  heure: true,
  lieu: true,
  avis: true,
  prochaineAvant: true,
  commentaire: true,
  nomFichier: true,
  salariePrevenuLe: true,
} as const;

export async function organismeSante() {
  return db.organismeSante.findUnique({ where: { id: "singleton" } });
}

// Les salariés suivis, avec l'état de leur suivi, ce qui demande une action en premier.
export async function chargerSuivis(aujourdHui = aujourdHuiUTC()) {
  const salaries = await db.salarieSante.findMany({
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    include: { visites: { select: champsVisite, orderBy: [{ date: "desc" }, { creeLe: "desc" }] }, user: { select: { email: true, actif: true } } },
  });
  return salaries
    .map((s) => ({ ...s, suivi: calculerSuivi(s, aujourdHui) as Suivi }))
    .sort((a, b) => ORDRE_ETAT[a.suivi.etat] - ORDRE_ETAT[b.suivi.etat] || a.nom.localeCompare(b.nom, "fr"));
}

// Profs de l'appli qui n'ont pas encore de fiche de suivi.
export async function profsSansFiche() {
  return db.user.findMany({
    where: { ...salariesDuRegistre, suiviSante: { is: null } },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    select: { id: true, nom: true, prenom: true },
  });
}

// Pour la tuile de l'accueil : visites en retard ou à confirmer, déclarations à faire,
// factures dont l'échéance est passée.
export async function resumeSante(aujourdHui = aujourdHuiUTC()) {
  const [suivis, facturesEnRetard, facturesAPayer] = await Promise.all([
    chargerSuivis(aujourdHui),
    db.factureSante.count({ where: { payeeLe: null, echeance: { lt: aujourdHui } } }),
    db.factureSante.count({ where: { payeeLe: null } }),
  ]);
  const compte = (etat: string) => suivis.filter((s) => s.suivi.etat === etat).length;
  return {
    salaries: suivis.filter((s) => s.suivi.etat !== "SORTI").length,
    enRetard: compte("EN_RETARD"),
    aConfirmer: compte("A_CONFIRMER"),
    bientot: compte("BIENTOT"),
    aRenseigner: compte("A_RENSEIGNER"),
    alertes: suivis.reduce((n, s) => n + s.suivi.alertes.length, 0),
    facturesEnRetard,
    facturesAPayer,
  };
}

export function quandVisite(v: { date: Date | null; heure: string | null }) {
  if (!v.date) return "date à venir";
  return `${dateLongue(v.date)}${v.heure ? ` à ${v.heure}` : ""}`;
}

// Transmet la convocation au salarié (mail et notification). Renvoie un message d'erreur,
// ou null si tout est parti.
export async function prevenirSalarie(visiteId: string, urlBase: string): Promise<string | null> {
  const v = await db.visiteMedicale.findUnique({
    where: { id: visiteId },
    select: { ...champsVisite, salarie: { select: { prenom: true, user: { select: { id: true, email: true, actif: true } } } } },
  });
  if (!v || v.statut !== "PREVUE" || !v.date) return "Indiquez d'abord la date de la convocation.";
  const user = v.salarie.user;
  if (!user?.actif) return "Ce salarié n'a pas de compte actif dans l'appli : prévenez-le directement.";
  const organisme = await organismeSante();
  const visite = LIBELLE_TYPE_VISITE[v.type].toLowerCase();
  try {
    await envoyerMailConvocationVisite({
      salarie: { prenom: v.salarie.prenom, email: user.email },
      visite,
      quand: quandVisite(v),
      lieu: v.lieu,
      organisme: organisme?.nom ?? null,
      url: `${urlBase}/contrats#visites`,
    });
  } catch (erreur) {
    console.error("Convocation non envoyée :", erreur);
    return "Le mail n'a pas pu partir. Réessayez dans quelques instants.";
  }
  await envoyerPush([user.id], { titre: "Visite de santé au travail", corps: `${visite.charAt(0).toUpperCase() + visite.slice(1)} le ${quandVisite(v)}`, url: "/contrats#visites" });
  await db.visiteMedicale.update({ where: { id: v.id }, data: { salariePrevenuLe: new Date() } });
  return null;
}

// Deux factures d'achat ne portent jamais le même nom : « 2026-10-28_Thomann (2).pdf ».
async function nomLibre(nom: string): Promise<string> {
  const base = nom.replace(/\.pdf$/i, "");
  for (let n = 1; ; n++) {
    const candidat = n === 1 ? nom : `${base} (${n}).pdf`;
    if (!(await db.facture.findFirst({ where: { nomFichier: candidat } }))) return candidat;
  }
}

// Range la facture avec les factures d'achat (Drive « Factures achats / année ») pour que
// la comptabilité la retrouve. false si le Drive n'est pas disponible.
export async function archiverFactureSante(id: string): Promise<boolean> {
  const f = await db.factureSante.findUnique({ where: { id } });
  if (!f || f.factureId) return !!f;
  const organisme = await organismeSante();
  const fournisseur = organisme?.nom || "Santé au travail";
  const jour = f.date.toISOString().slice(0, 10);
  const nomFichier = await nomLibre(nomFichierFacture(jour, fournisseur));
  const fichier = await deposerFacture({ annee: f.date.getUTCFullYear(), nomFichier, pdf: Buffer.from(f.pdf) });
  if (!fichier) return false;
  const facture = await db.facture.create({
    data: { date: f.date, fournisseur, montantCentimes: f.montantCentimes, objet: f.objet, nomFichier, driveFileId: fichier.id, url: fichier.url },
  });
  await db.factureSante.update({ where: { id }, data: { factureId: facture.id, nomFichier } });
  return true;
}
