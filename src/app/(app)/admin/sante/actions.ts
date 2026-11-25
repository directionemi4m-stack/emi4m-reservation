"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { urlBase } from "@/lib/url";
import { scanEnPdf } from "@/lib/scanEnPdf";
import { lireEuros } from "@/lib/inventaire";
import { estJetonRevoqueOuExpire, mettreALaCorbeilleDrive } from "@/lib/drive";
import { AVIS, CATEGORIES, STATUTS_VISITE, TYPES_VISITE, type AvisVisite, type CategorieSuivi, type StatutVisite, type TypeVisite } from "@/lib/santeTravail";
import { archiverFactureSante, prevenirSalarie, profsSansFiche } from "@/lib/santeTravailServeur";

export type EtatAction = { succes: boolean; message?: string };

async function exigerDirection() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") throw new Error("Accès réservé à la direction.");
}

const champ = (fd: FormData, nom: string, max = 200) => String(fd.get(nom) ?? "").trim().slice(0, max);
const ou = (t: string) => t || null;

// « AAAA-MM-JJ » → date (minuit UTC) ; null si vide ; « invalide » si illisible.
function lireDate(fd: FormData, nom: string): Date | null | "invalide" {
  const t = champ(fd, nom, 10);
  if (!t) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return "invalide";
  const d = new Date(`${t}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? "invalide" : d;
}

function lireDates<N extends string>(fd: FormData, noms: readonly N[]): Record<N, Date | null> | null {
  const r = {} as Record<N, Date | null>;
  for (const n of noms) {
    const d = lireDate(fd, n);
    if (d === "invalide") return null;
    r[n] = d;
  }
  return r;
}

function revalider(salarieId?: string) {
  revalidatePath("/admin/sante");
  if (salarieId) revalidatePath(`/admin/sante/salarie/${salarieId}`);
  revalidatePath("/contrats");
}

// --- Salariés ---

// Crée une fiche pour chaque prof de l'appli qui n'en a pas encore.
export async function importerProfs(): Promise<EtatAction> {
  await exigerDirection();
  const profs = await profsSansFiche();
  for (const p of profs) await db.salarieSante.create({ data: { userId: p.id, nom: p.nom, prenom: p.prenom } });
  revalider();
  return { succes: true, message: profs.length ? `${profs.length} fiche${profs.length > 1 ? "s" : ""} créée${profs.length > 1 ? "s" : ""}.` : "Tous les profs ont déjà leur fiche." };
}

// Une personne salariée sans compte dans l'appli (ou un prof choisi dans la liste).
export async function ajouterSalarie(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await exigerDirection();
  const userId = champ(fd, "userId", 40);
  if (userId) {
    const u = await db.user.findUnique({ where: { id: userId }, select: { nom: true, prenom: true, suiviSante: { select: { id: true } } } });
    if (!u) return { succes: false, message: "Ce prof n'existe plus." };
    if (u.suiviSante) return { succes: false, message: "Ce prof a déjà sa fiche." };
    await db.salarieSante.create({ data: { userId, nom: u.nom, prenom: u.prenom } });
  } else {
    const nom = champ(fd, "nom", 80);
    const prenom = champ(fd, "prenom", 80);
    if (!nom || !prenom) return { succes: false, message: "Indiquez le nom et le prénom." };
    await db.salarieSante.create({ data: { nom, prenom, poste: ou(champ(fd, "poste", 120)) } });
  }
  revalider();
  return { succes: true, message: "Fiche créée." };
}

export async function enregistrerSalarie(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await exigerDirection();
  const id = champ(fd, "id", 40);
  const s = await db.salarieSante.findUnique({ where: { id }, select: { id: true, userId: true } });
  if (!s) return { succes: false, message: "Cette fiche n'existe plus." };
  const dates = lireDates(fd, ["embaucheLe", "sortieLe", "affilieLe", "desaffilieLe"] as const);
  if (!dates) return { succes: false, message: "Une date est invalide." };
  if (dates.embaucheLe && dates.sortieLe && dates.sortieLe < dates.embaucheLe) return { succes: false, message: "La date de départ est avant l'embauche." };
  if (dates.affilieLe && dates.desaffilieLe && dates.desaffilieLe < dates.affilieLe) return { succes: false, message: "La fin de déclaration est avant la déclaration." };
  const categorie = champ(fd, "categorie", 3) as CategorieSuivi;
  if (!CATEGORIES.includes(categorie)) return { succes: false, message: "Choisissez le type de suivi." };
  const anneeBrute = champ(fd, "anneeNaissance", 4);
  const anneeNaissance = anneeBrute ? Number(anneeBrute) : null;
  if (anneeNaissance !== null && (!Number.isInteger(anneeNaissance) || anneeNaissance < 1930 || anneeNaissance > 2015)) {
    return { succes: false, message: "Année de naissance invalide." };
  }
  const nom = champ(fd, "nom", 80);
  const prenom = champ(fd, "prenom", 80);
  if (!s.userId && (!nom || !prenom)) return { succes: false, message: "Indiquez le nom et le prénom." };
  await db.salarieSante.update({
    where: { id },
    data: {
      ...(s.userId ? {} : { nom, prenom }),
      poste: ou(champ(fd, "poste", 120)),
      categorie,
      anneeNaissance,
      notes: ou(champ(fd, "notes", 1000)),
      ...dates,
    },
  });
  revalider(id);
  return { succes: true, message: "Enregistré." };
}

// Seulement une fiche sans visite (créée par erreur) ; sinon on indique la date de départ.
export async function supprimerSalarie(fd: FormData) {
  await exigerDirection();
  const id = champ(fd, "id", 40);
  const n = await db.visiteMedicale.count({ where: { salarieId: id } });
  if (n > 0) return;
  await db.salarieSante.deleteMany({ where: { id } });
  revalider();
  redirect("/admin/sante");
}

// --- Visites ---

export async function enregistrerVisite(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await exigerDirection();
  const salarieId = champ(fd, "salarieId", 40);
  const id = champ(fd, "id", 40);
  const salarie = await db.salarieSante.findUnique({ where: { id: salarieId }, select: { id: true } });
  if (!salarie) return { succes: false, message: "Cette fiche n'existe plus." };
  const existante = id ? await db.visiteMedicale.findFirst({ where: { id, salarieId }, select: { id: true, date: true, heure: true, statut: true } }) : null;
  if (id && !existante) return { succes: false, message: "Cette visite n'existe plus." };

  const type = champ(fd, "type", 20) as TypeVisite;
  const statut = champ(fd, "statut", 20) as StatutVisite;
  if (!TYPES_VISITE.includes(type)) return { succes: false, message: "Choisissez le type de visite." };
  if (!STATUTS_VISITE.includes(statut)) return { succes: false, message: "Choisissez où en est la visite." };
  const dates = lireDates(fd, ["date", "prochaineAvant"] as const);
  if (!dates) return { succes: false, message: "Une date est invalide." };
  if ((statut === "PREVUE" || statut === "REALISEE") && !dates.date) return { succes: false, message: "Indiquez la date de la visite." };
  const avisBrut = champ(fd, "avis", 20);
  const avis = statut === "REALISEE" && AVIS.includes(avisBrut as AvisVisite) ? (avisBrut as AvisVisite) : null;
  if (dates.prochaineAvant && dates.date && dates.prochaineAvant <= dates.date) return { succes: false, message: "La prochaine visite doit être après celle-ci." };

  const pdf = await scanEnPdf(fd, "fichiers");
  if (pdf && "erreur" in pdf) return { succes: false, message: pdf.erreur };

  const donnees = {
    type,
    statut,
    date: dates.date,
    heure: statut === "PREVUE" || statut === "REALISEE" ? ou(champ(fd, "heure", 20)) : null,
    lieu: ou(champ(fd, "lieu", 200)),
    avis,
    prochaineAvant: statut === "REALISEE" ? dates.prochaineAvant : null,
    commentaire: ou(champ(fd, "commentaire", 500)),
    ...(pdf ? { pdf: Uint8Array.from(pdf), nomFichier: `Visite ${dates.date?.toISOString().slice(0, 10) ?? ""}.pdf`.replace(" .pdf", ".pdf") } : {}),
  };
  // Nouvelle date ou heure de convocation : le salarié devra être prévenu à nouveau.
  const convocationChangee =
    !existante || existante.statut !== statut || existante.date?.getTime() !== dates.date?.getTime() || existante.heure !== donnees.heure;
  const visite = existante
    ? await db.visiteMedicale.update({ where: { id: existante.id }, data: { ...donnees, ...(convocationChangee ? { salariePrevenuLe: null } : {}) } })
    : await db.visiteMedicale.create({ data: { ...donnees, salarieId } });

  let message = existante ? "Visite enregistrée." : "Visite ajoutée.";
  if (statut === "PREVUE" && fd.get("prevenir") === "on" && (convocationChangee || !existante)) {
    const erreur = await prevenirSalarie(visite.id, await urlBase());
    message = erreur ? `Visite enregistrée, mais ${erreur.charAt(0).toLowerCase()}${erreur.slice(1)}` : `${message} Le salarié a été prévenu par mail.`;
    revalider(salarieId);
    return { succes: !erreur, message };
  }
  revalider(salarieId);
  return { succes: true, message };
}

export async function prevenirPourVisite(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await exigerDirection();
  const id = champ(fd, "id", 40);
  const erreur = await prevenirSalarie(id, await urlBase());
  const v = await db.visiteMedicale.findUnique({ where: { id }, select: { salarieId: true } });
  revalider(v?.salarieId);
  return erreur ? { succes: false, message: erreur } : { succes: true, message: "Salarié prévenu par mail." };
}

export async function supprimerVisite(fd: FormData) {
  await exigerDirection();
  const v = await db.visiteMedicale.findUnique({ where: { id: champ(fd, "id", 40) }, select: { id: true, salarieId: true } });
  if (!v) return;
  await db.visiteMedicale.delete({ where: { id: v.id } });
  revalider(v.salarieId);
}

export async function retirerAttestation(fd: FormData) {
  await exigerDirection();
  const v = await db.visiteMedicale.findUnique({ where: { id: champ(fd, "id", 40) }, select: { id: true, salarieId: true } });
  if (!v) return;
  await db.visiteMedicale.update({ where: { id: v.id }, data: { pdf: null, nomFichier: null } });
  revalider(v.salarieId);
}

// --- Organisme ---

export async function enregistrerOrganisme(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await exigerDirection();
  const nom = champ(fd, "nom", 120);
  if (!nom) return { succes: false, message: "Indiquez le nom du service." };
  const siteWeb = champ(fd, "siteWeb", 300);
  if (siteWeb && !/^https?:\/\/\S+$/i.test(siteWeb)) return { succes: false, message: "Le site doit commencer par https://" };
  const email = champ(fd, "email", 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { succes: false, message: "Adresse mail invalide." };
  const donnees = { nom, numeroAdherent: ou(champ(fd, "numeroAdherent", 60)), adresse: ou(champ(fd, "adresse", 300)), telephone: ou(champ(fd, "telephone", 40)), email: ou(email), siteWeb: ou(siteWeb) };
  await db.organismeSante.upsert({ where: { id: "singleton" }, create: { id: "singleton", ...donnees }, update: donnees });
  revalidatePath("/admin/sante", "layout");
  return { succes: true, message: "Enregistré." };
}

// --- Factures ---

type ChampsFacture = { date: Date; numero: string | null; objet: string; anneeCotisation: number; montantCentimes: number | null; nombreSalaries: number | null; echeance: Date | null; payeeLe: Date | null };

function lireFacture(fd: FormData): { erreur: string } | ChampsFacture {
  const dates = lireDates(fd, ["date", "echeance", "payeeLe"] as const);
  if (!dates) return { erreur: "Une date est invalide." };
  if (!dates.date) return { erreur: "Indiquez la date de la facture." };
  const objet = champ(fd, "objet", 200);
  if (!objet) return { erreur: "Indiquez l'objet (ex. « Cotisation 2027 »)." };
  const anneeCotisation = Number(champ(fd, "anneeCotisation", 4));
  if (!Number.isInteger(anneeCotisation) || anneeCotisation < 2000 || anneeCotisation > 2100) return { erreur: "Année invalide." };
  const montantBrut = champ(fd, "montant", 20);
  const montantCentimes = montantBrut ? lireEuros(montantBrut) : null;
  if (montantBrut && montantCentimes === null) return { erreur: "Montant invalide (ex. 1 250,40)." };
  const nombreBrut = champ(fd, "nombreSalaries", 4);
  const nombreSalaries = nombreBrut ? Number(nombreBrut) : null;
  if (nombreSalaries !== null && (!Number.isInteger(nombreSalaries) || nombreSalaries < 0)) return { erreur: "Nombre de salariés invalide." };
  return { date: dates.date, numero: ou(champ(fd, "numero", 60)), objet, anneeCotisation, montantCentimes, nombreSalaries, echeance: dates.echeance, payeeLe: dates.payeeLe };
}

const MESSAGE_DRIVE = " Elle sera rangée dans le Drive dès qu'il sera disponible (bouton « Ranger dans le Drive »).";

async function essayerArchiver(id: string): Promise<string> {
  try {
    return (await archiverFactureSante(id)) ? " Rangée aussi dans le Drive avec les factures d'achat." : MESSAGE_DRIVE;
  } catch (erreur) {
    console.error("Facture santé non archivée dans le Drive :", erreur);
    return estJetonRevoqueOuExpire(erreur) ? " La connexion à Google Drive a expiré : reconnectez-la dans Paramètres." : MESSAGE_DRIVE;
  }
}

export async function ajouterFactureSante(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await exigerDirection();
  const f = lireFacture(fd);
  if ("erreur" in f) return { succes: false, message: f.erreur };
  const pdf = await scanEnPdf(fd, "fichiers");
  if (!pdf) return { succes: false, message: "Ajoutez la facture (PDF ou photos)." };
  if ("erreur" in pdf) return { succes: false, message: pdf.erreur };
  const cree = await db.factureSante.create({ data: { ...f, pdf: Uint8Array.from(pdf), nomFichier: `Facture ${f.date.toISOString().slice(0, 10)}.pdf` } });
  const suite = await essayerArchiver(cree.id);
  revalidatePath("/admin/sante", "layout");
  revalidatePath("/admin/achats");
  return { succes: true, message: `Facture ajoutée.${suite}` };
}

export async function modifierFactureSante(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await exigerDirection();
  const existante = await db.factureSante.findUnique({ where: { id: champ(fd, "id", 40) }, select: { id: true, factureId: true } });
  if (!existante) return { succes: false, message: "Cette facture n'existe plus." };
  const f = lireFacture(fd);
  if ("erreur" in f) return { succes: false, message: f.erreur };
  await db.factureSante.update({ where: { id: existante.id }, data: f });
  if (existante.factureId) {
    await db.facture.update({ where: { id: existante.factureId }, data: { date: f.date, montantCentimes: f.montantCentimes, objet: f.objet } });
  }
  revalidatePath("/admin/sante", "layout");
  revalidatePath("/admin/achats");
  return { succes: true, message: "Enregistré." };
}

export async function marquerFacturePayee(fd: FormData) {
  await exigerDirection();
  const id = champ(fd, "id", 40);
  const annuler = fd.get("annuler") === "1";
  const aujourdHui = new Date(`${new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" })}T00:00:00.000Z`);
  await db.factureSante.updateMany({ where: { id }, data: { payeeLe: annuler ? null : aujourdHui } });
  revalidatePath("/admin/sante", "layout");
}

export async function rangerFactureDansDrive(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await exigerDirection();
  const suite = await essayerArchiver(champ(fd, "id", 40));
  revalidatePath("/admin/sante", "layout");
  revalidatePath("/admin/achats");
  return suite === MESSAGE_DRIVE ? { succes: false, message: "Google Drive indisponible pour le moment." } : { succes: true, message: suite.trim() };
}

// Supprimer : la copie rangée avec les factures d'achat part dans la corbeille du Drive
// (récupérable 30 jours).
export async function supprimerFactureSante(fd: FormData) {
  await exigerDirection();
  const f = await db.factureSante.findUnique({ where: { id: champ(fd, "id", 40) }, select: { id: true, facture: { select: { id: true, driveFileId: true } } } });
  if (!f) return;
  if (f.facture) {
    try {
      await mettreALaCorbeilleDrive(f.facture.driveFileId);
    } catch (erreur) {
      console.error("Mise à la corbeille de la facture impossible :", erreur);
    }
  }
  await db.factureSante.delete({ where: { id: f.id } });
  if (f.facture) await db.facture.delete({ where: { id: f.facture.id } });
  revalidatePath("/admin/sante", "layout");
  revalidatePath("/admin/achats");
}
