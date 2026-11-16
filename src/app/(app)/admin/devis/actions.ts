"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { extractText, getDocumentProxy } from "unpdf";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ajouterJours, ECHEANCE_JOURS, lireCentimes, lireLignes, nomFichierDocument, prochainNumero, VALIDITE_JOURS, type Ligne } from "@/lib/devis";
import { devinerFacture, nomFichierFacture, normaliserNomFichier } from "@/lib/factures";
import { photosEnPdf } from "@/lib/photoEnPdf";
import { deposerDocumentDevis, estJetonRevoqueOuExpire, mettreALaCorbeilleDrive, rangerDocumentDevis, renommerFichierDrive } from "@/lib/drive";
import { archiverPdfDevis, archiverPdfFacture, pdfFacture } from "@/lib/devisServeur";
import { envoyerMailDocument } from "@/lib/mail";

export type EtatAction = { succes: boolean; message?: string };

async function exigerAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") throw new Error("Accès réservé à la direction.");
}

const champ = (fd: FormData, nom: string, max = 500) => String(fd.get(nom) ?? "").trim().slice(0, max);
const optionnel = (fd: FormData, nom: string, max = 500) => champ(fd, nom, max) || null;
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;
const versDate = (j: string) => new Date(`${j}T00:00:00.000Z`);
const aujourdHui = () => versDate(new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" }));
const dateOu = (fd: FormData, nom: string, defaut: Date) => {
  const v = champ(fd, nom, 10);
  return DATE_ISO.test(v) ? versDate(v) : defaut;
};

function lignesDuFormulaire(fd: FormData) {
  return lireLignes({
    designations: fd.getAll("ligneDesignation").map(String),
    quantites: fd.getAll("ligneQuantite").map(String),
    unites: fd.getAll("ligneUnite").map(String),
    prix: fd.getAll("lignePrix").map(String),
  });
}
const creerLignes = (lignes: Ligne[]) => lignes.map((l, i) => ({ ...l, ordre: i + 1 }));

function revalider() {
  revalidatePath("/admin/devis", "layout");
  revalidatePath("/accueil");
}

const messageDrive = (erreur: unknown) =>
  estJetonRevoqueOuExpire(erreur) ? "La connexion à Google Drive a expiré : reconnectez-la dans Paramètres." : "L'envoi vers le Drive a échoué. Réessayez.";

// Fichiers déposés (un PDF, ou des photos assemblées en PDF).
const TAILLE_MAX = 10 * 1024 * 1024;
const estPdf = (o: Uint8Array) => Buffer.from(o.subarray(0, 5)).toString() === "%PDF-";
const estJpeg = (o: Uint8Array) => o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff;
async function fichiersEnPdf(fd: FormData, nom = "fichiers"): Promise<Buffer | null | { erreur: string }> {
  const fichiers = await Promise.all(
    fd.getAll(nom).filter((f): f is File => f instanceof File && f.size > 0).map(async (f) => new Uint8Array(await f.arrayBuffer()))
  );
  if (fichiers.length === 0) return null;
  if (fichiers.reduce((s, f) => s + f.length, 0) > TAILLE_MAX) return { erreur: "Fichiers trop lourds (10 Mo au total)." };
  if (fichiers.length === 1 && estPdf(fichiers[0])) return Buffer.from(fichiers[0]);
  if (fichiers.every(estJpeg)) return Buffer.from(await photosEnPdf(fichiers));
  return { erreur: "Envoyez un PDF, ou des photos." };
}

// ===================== Devis émis =====================

async function nouveauNumero(prefixe: "D" | "F", annee: number) {
  const existants =
    prefixe === "D"
      ? (await db.devisEmis.findMany({ where: { annee }, select: { numero: true } })).map((x) => x.numero)
      : (await db.factureEmise.findMany({ where: { annee }, select: { numero: true } })).map((x) => x.numero);
  return prochainNumero(prefixe, annee, existants);
}

export async function enregistrerDevis(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await exigerAdmin();
  const clientNom = champ(fd, "clientNom", 120);
  const objet = champ(fd, "objet", 300);
  if (!clientNom) return { succes: false, message: "Le client est requis." };
  if (!objet) return { succes: false, message: "L'objet du devis est requis." };
  const lus = lignesDuFormulaire(fd);
  if ("erreur" in lus) return { succes: false, message: lus.erreur };
  const dateDevis = dateOu(fd, "dateDevis", aujourdHui());
  const donnees = {
    clientNom,
    clientAdresse: optionnel(fd, "clientAdresse"),
    clientEmail: optionnel(fd, "clientEmail", 200),
    objet,
    datePrestation: optionnel(fd, "datePrestation", 120),
    dateDevis,
    valableJusquAu: dateOu(fd, "valableJusquAu", ajouterJours(dateDevis, VALIDITE_JOURS)),
    conditions: optionnel(fd, "conditions"),
    notes: optionnel(fd, "notes", 1000),
  };

  const id = champ(fd, "id", 40);
  if (id) {
    const avant = await db.devisEmis.findUnique({ where: { id } });
    if (!avant) return { succes: false, message: "Ce devis n'existe plus." };
    if (avant.statut !== "BROUILLON") return { succes: false, message: "Un devis envoyé ne se modifie plus : dupliquez-le." };
    await db.$transaction([
      db.ligneDocument.deleteMany({ where: { devisId: id } }),
      db.devisEmis.update({ where: { id }, data: { ...donnees, lignes: { create: creerLignes(lus.lignes) } } }),
    ]);
    revalider();
    redirect(`/admin/devis/${id}`);
  }
  const annee = dateDevis.getUTCFullYear();
  const cree = await db.devisEmis.create({
    data: { ...donnees, annee, numero: await nouveauNumero("D", annee), lignes: { create: creerLignes(lus.lignes) } },
  });
  revalider();
  redirect(`/admin/devis/${cree.id}`);
}

export async function supprimerDevis(fd: FormData) {
  await exigerAdmin();
  const d = await db.devisEmis.findUnique({ where: { id: champ(fd, "id", 40) } });
  if (!d || d.statut !== "BROUILLON") return;
  await db.devisEmis.delete({ where: { id: d.id } });
  revalider();
  redirect("/admin/devis");
}

export async function dupliquerDevis(fd: FormData) {
  await exigerAdmin();
  const d = await db.devisEmis.findUnique({ where: { id: champ(fd, "id", 40) }, include: { lignes: { orderBy: { ordre: "asc" } } } });
  if (!d) return;
  const date = aujourdHui();
  const annee = date.getUTCFullYear();
  const copie = await db.devisEmis.create({
    data: {
      numero: await nouveauNumero("D", annee),
      annee,
      dateDevis: date,
      valableJusquAu: ajouterJours(date, VALIDITE_JOURS),
      clientNom: d.clientNom,
      clientAdresse: d.clientAdresse,
      clientEmail: d.clientEmail,
      objet: d.objet,
      datePrestation: d.datePrestation,
      conditions: d.conditions,
      notes: d.notes,
      lignes: { create: d.lignes.map(({ designation, quantite, unite, prixUnitaireCentimes, ordre }) => ({ designation, quantite, unite, prixUnitaireCentimes, ordre })) },
    },
  });
  revalider();
  redirect(`/admin/devis/${copie.id}`);
}

// Envoi au client : le PDF est archivé dans le Drive, puis joint au mail relu par la direction.
export async function envoyerDevis(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await exigerAdmin();
  const id = champ(fd, "id", 40);
  const a = champ(fd, "a", 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a)) return { succes: false, message: "Adresse mail du client invalide." };
  const d = await db.devisEmis.findUnique({ where: { id } });
  if (!d || d.statut === "ACCEPTE" || d.statut === "REFUSE") return { succes: false, message: "Ce devis ne peut plus être envoyé." };
  let fichier;
  try {
    fichier = await archiverPdfDevis(id);
  } catch (erreur) {
    return { succes: false, message: messageDrive(erreur) };
  }
  if (!fichier) return { succes: false, message: "Devis introuvable." };
  try {
    await envoyerMailDocument({ a, sujet: champ(fd, "sujet", 200) || `Devis ${d.numero}`, message: champ(fd, "message", 5000), pdf: fichier.pdf, nomFichier: fichier.nomFichier });
  } catch (erreur) {
    console.error("Envoi du devis impossible :", erreur);
    return { succes: false, message: "Le mail n'est pas parti. Réessayez, ou téléchargez le PDF pour l'envoyer vous-même." };
  }
  await db.devisEmis.update({ where: { id }, data: { statut: "ENVOYE", envoyeLe: new Date(), clientEmail: d.clientEmail ?? a } });
  revalider();
  return { succes: true, message: `Devis envoyé à ${a}.` };
}

// Envoyé autrement (remis en main propre, envoyé depuis sa propre messagerie…).
export async function marquerDevisEnvoye(fd: FormData) {
  await exigerAdmin();
  const id = champ(fd, "id", 40);
  const d = await db.devisEmis.findUnique({ where: { id } });
  if (!d || d.statut !== "BROUILLON") return;
  try {
    await archiverPdfDevis(id);
  } catch (erreur) {
    console.error("Archivage du devis impossible :", erreur);
  }
  await db.devisEmis.update({ where: { id }, data: { statut: "ENVOYE", envoyeLe: new Date() } });
  revalider();
}

// Accepté (avec le devis signé, facultatif), refusé (motif), ou rouvert.
export async function deciderDevis(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await exigerAdmin();
  const id = champ(fd, "id", 40);
  const decision = champ(fd, "decision", 10);
  const d = await db.devisEmis.findUnique({ where: { id } });
  if (!d || d.statut === "BROUILLON") return { succes: false, message: "Envoyez d'abord le devis." };
  if (decision === "ENVOYE") {
    await db.devisEmis.update({ where: { id }, data: { statut: "ENVOYE", decideLe: null, motifRefus: null } });
    revalider();
    return { succes: true, message: "Devis rouvert." };
  }
  if (decision !== "ACCEPTE" && decision !== "REFUSE") return { succes: false, message: "Décision inconnue." };

  const signe = await fichiersEnPdf(fd);
  if (signe && "erreur" in signe) return { succes: false, message: signe.erreur };
  let depot: { id: string; url: string } | null = null;
  if (signe) {
    try {
      depot = await deposerDocumentDevis({
        dossier: "Devis émis",
        annee: d.annee,
        nomFichier: nomFichierDocument(d.numero, d.clientNom, " - signé"),
        pdf: signe,
        fichierExistantId: d.signeDriveFileId,
      });
      if (!depot) return { succes: false, message: "Envoi vers Google Drive indisponible." };
    } catch (erreur) {
      return { succes: false, message: messageDrive(erreur) };
    }
  }
  await db.devisEmis.update({
    where: { id },
    data: {
      statut: decision,
      decideLe: new Date(),
      motifRefus: decision === "REFUSE" ? optionnel(fd, "motif", 300) : null,
      ...(depot ? { signeDriveFileId: depot.id, signeUrl: depot.url } : {}),
    },
  });
  revalider();
  return { succes: true, message: decision === "ACCEPTE" ? "Devis accepté." : "Devis refusé." };
}

// ===================== Factures émises =====================

export async function emettreFacture(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await exigerAdmin();
  const clientNom = champ(fd, "clientNom", 120);
  const objet = champ(fd, "objet", 300);
  if (!clientNom) return { succes: false, message: "Le client est requis." };
  if (!objet) return { succes: false, message: "L'objet de la facture est requis." };
  const lus = lignesDuFormulaire(fd);
  if ("erreur" in lus) return { succes: false, message: lus.erreur };
  const devisId = optionnel(fd, "devisId", 40);
  if (devisId && !(await db.devisEmis.findUnique({ where: { id: devisId } }))) return { succes: false, message: "Devis introuvable." };
  const dateFacture = dateOu(fd, "dateFacture", aujourdHui());
  const annee = dateFacture.getUTCFullYear();

  let facture;
  for (let essai = 0; ; essai++) {
    try {
      facture = await db.factureEmise.create({
        data: {
          numero: await nouveauNumero("F", annee),
          annee,
          devisId,
          dateFacture,
          echeance: dateOu(fd, "echeance", ajouterJours(dateFacture, ECHEANCE_JOURS)),
          clientNom,
          clientAdresse: optionnel(fd, "clientAdresse"),
          clientEmail: optionnel(fd, "clientEmail", 200),
          objet,
          datePrestation: optionnel(fd, "datePrestation", 120),
          conditions: optionnel(fd, "conditions"),
          lignes: { create: creerLignes(lus.lignes) },
        },
      });
      break;
    } catch (erreur) {
      // Deux factures émises au même instant : on reprend le numéro suivant.
      if (essai < 2 && (erreur as { code?: string }).code === "P2002") continue;
      throw erreur;
    }
  }
  try {
    await archiverPdfFacture(facture.id);
  } catch (erreur) {
    console.error("Archivage de la facture impossible :", erreur);
  }
  revalider();
  redirect(`/admin/devis/factures/${facture.id}`);
}

export async function envoyerFacture(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await exigerAdmin();
  const id = champ(fd, "id", 40);
  const a = champ(fd, "a", 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a)) return { succes: false, message: "Adresse mail du client invalide." };
  const f = await db.factureEmise.findUnique({ where: { id } });
  if (!f) return { succes: false, message: "Facture introuvable." };
  const fichier = await pdfFacture(id);
  if (!fichier) return { succes: false, message: "Facture introuvable." };
  if (!f.pdfDriveFileId) {
    try {
      await archiverPdfFacture(id);
    } catch (erreur) {
      console.error("Archivage de la facture impossible :", erreur);
    }
  }
  try {
    await envoyerMailDocument({ a, sujet: champ(fd, "sujet", 200) || `Facture ${f.numero}`, message: champ(fd, "message", 5000), pdf: fichier.pdf, nomFichier: fichier.nomFichier });
  } catch (erreur) {
    console.error("Envoi de la facture impossible :", erreur);
    return { succes: false, message: "Le mail n'est pas parti. Réessayez, ou téléchargez le PDF pour l'envoyer vous-même." };
  }
  await db.factureEmise.update({ where: { id }, data: { envoyeeLe: new Date(), clientEmail: f.clientEmail ?? a } });
  revalider();
  return { succes: true, message: `Facture envoyée à ${a}.` };
}

export async function basculerFacturePayee(fd: FormData) {
  await exigerAdmin();
  const f = await db.factureEmise.findUnique({ where: { id: champ(fd, "id", 40) } });
  if (!f) return;
  const date = champ(fd, "payeeLe", 10);
  await db.factureEmise.update({ where: { id: f.id }, data: { payeeLe: f.payeeLe ? null : DATE_ISO.test(date) ? versDate(date) : aujourdHui() } });
  revalider();
}

// Numérotation sans trou : seule la dernière facture de l'année peut être supprimée.
export async function supprimerFactureEmise(fd: FormData) {
  await exigerAdmin();
  const f = await db.factureEmise.findUnique({ where: { id: champ(fd, "id", 40) } });
  if (!f) return;
  const derniere = await db.factureEmise.findMany({ where: { annee: f.annee }, select: { numero: true } });
  if (prochainNumero("F", f.annee, derniere.map((x) => x.numero)) !== prochainNumero("F", f.annee, [f.numero])) return;
  if (f.pdfDriveFileId) {
    try {
      await mettreALaCorbeilleDrive(f.pdfDriveFileId);
    } catch (erreur) {
      console.error("Mise à la corbeille de la facture impossible :", erreur);
    }
  }
  await db.factureEmise.delete({ where: { id: f.id } });
  revalider();
  redirect("/admin/devis/factures");
}

// ===================== Rubriques de prestations =====================

export async function enregistrerRubrique(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await exigerAdmin();
  const libelle = champ(fd, "libelle", 120);
  if (!libelle) return { succes: false, message: "Le nom de la prestation est requis." };
  const prixBrut = champ(fd, "prix", 20);
  const prixUnitaireCentimes = prixBrut ? lireCentimes(prixBrut) : null;
  if (prixBrut && prixUnitaireCentimes === null) return { succes: false, message: "Prix invalide (ex. 45 ou 45,50)." };
  const donnees = { libelle, description: optionnel(fd, "description", 300), unite: optionnel(fd, "unite", 30), prixUnitaireCentimes };
  const id = champ(fd, "id", 40);
  if (id) await db.rubriquePrestation.update({ where: { id }, data: donnees });
  else {
    const max = await db.rubriquePrestation.aggregate({ _max: { ordre: true } });
    await db.rubriquePrestation.create({ data: { ...donnees, ordre: (max._max.ordre ?? 0) + 1 } });
  }
  revalider();
  return { succes: true, message: id ? "Prestation modifiée." : "Prestation ajoutée." };
}

export async function basculerRubrique(fd: FormData) {
  await exigerAdmin();
  const r = await db.rubriquePrestation.findUnique({ where: { id: champ(fd, "id", 40) } });
  if (!r) return;
  await db.rubriquePrestation.update({ where: { id: r.id }, data: { actif: !r.actif } });
  revalider();
}

// ===================== Devis reçus (fournisseurs) =====================

const SOUS_DOSSIER = { EN_ATTENTE: "En attente", SIGNE: "Signés", ABANDONNE: "Abandonnés" } as const;

// Lit le texte d'un devis PDF pour proposer fournisseur, date et montant (comme pour les factures).
export async function analyserDevisRecu(fd: FormData): Promise<{ date: string | null; fournisseur: string | null; montantCentimes: number | null }> {
  await exigerAdmin();
  const fichier = fd.get("fichiers");
  if (fichier instanceof File && fichier.size > 0 && fichier.size <= TAILLE_MAX) {
    const octets = new Uint8Array(await fichier.arrayBuffer());
    if (estPdf(octets)) {
      try {
        const { text } = await extractText(await getDocumentProxy(Uint8Array.from(octets)), { mergePages: false });
        const connus = [
          ...(await db.devisRecu.findMany({ distinct: ["fournisseur"], select: { fournisseur: true } })).map((x) => x.fournisseur),
          ...(await db.facture.findMany({ distinct: ["fournisseur"], select: { fournisseur: true } })).map((x) => x.fournisseur),
        ];
        const d = devinerFacture((Array.isArray(text) ? text : [text]).slice(0, 3).join("\n"), connus, new Date());
        return { date: d.date, fournisseur: d.fournisseur, montantCentimes: d.montantCentimes };
      } catch (erreur) {
        console.error("Lecture du texte du devis impossible :", erreur);
      }
    }
  }
  return { date: null, fournisseur: null, montantCentimes: null };
}

export async function archiverDevisRecu(fd: FormData): Promise<EtatAction> {
  await exigerAdmin();
  const fournisseur = champ(fd, "fournisseur", 80);
  if (!fournisseur) return { succes: false, message: "Le fournisseur est requis." };
  const date = dateOu(fd, "date", aujourdHui());
  const montantBrut = champ(fd, "montant", 20);
  const montantCentimes = montantBrut ? lireCentimes(montantBrut) : null;
  if (montantBrut && montantCentimes === null) return { succes: false, message: "Montant invalide (ex. 1 250,00)." };
  const pdf = await fichiersEnPdf(fd);
  if (!pdf) return { succes: false, message: "Ajoutez le devis (PDF ou photos)." };
  if ("erreur" in pdf) return { succes: false, message: pdf.erreur };
  const nomFichier = normaliserNomFichier(nomFichierFacture(date.toISOString().slice(0, 10), `${fournisseur} (devis)`));
  try {
    const depot = await deposerDocumentDevis({ dossier: "Devis reçus", annee: date.getUTCFullYear(), sousDossier: SOUS_DOSSIER.EN_ATTENTE, nomFichier, pdf });
    if (!depot) return { succes: false, message: "Envoi vers Google Drive indisponible." };
    await db.devisRecu.create({
      data: {
        date,
        fournisseur,
        montantCentimes,
        objet: optionnel(fd, "objet", 200),
        valableJusquAu: champ(fd, "valableJusquAu", 10) && DATE_ISO.test(champ(fd, "valableJusquAu", 10)) ? versDate(champ(fd, "valableJusquAu", 10)) : null,
        nomFichier,
        driveFileId: depot.id,
        url: depot.url,
      },
    });
  } catch (erreur) {
    console.error("Archivage du devis reçu impossible :", erreur);
    return { succes: false, message: messageDrive(erreur) };
  }
  revalider();
  return { succes: true, message: `Devis archivé : ${nomFichier}` };
}

// Signé (avec la version signée, facultative), abandonné (motif), ou remis en attente : le
// fichier change de sous-dossier dans le Drive.
export async function changerStatutDevisRecu(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await exigerAdmin();
  const d = await db.devisRecu.findUnique({ where: { id: champ(fd, "id", 40) } });
  if (!d) return { succes: false, message: "Ce devis n'existe plus." };
  const statut = champ(fd, "statut", 12) as keyof typeof SOUS_DOSSIER;
  if (!(statut in SOUS_DOSSIER)) return { succes: false, message: "État inconnu." };
  const annee = d.date.getUTCFullYear();

  const signe = statut === "SIGNE" ? await fichiersEnPdf(fd) : null;
  if (signe && "erreur" in signe) return { succes: false, message: signe.erreur };
  let depot: { id: string; url: string } | null = null;
  try {
    await rangerDocumentDevis({ fileId: d.driveFileId, dossier: "Devis reçus", annee, sousDossier: SOUS_DOSSIER[statut] });
    if (signe) {
      depot = await deposerDocumentDevis({
        dossier: "Devis reçus",
        annee,
        sousDossier: SOUS_DOSSIER.SIGNE,
        nomFichier: d.nomFichier.replace(/\.pdf$/i, " - signé.pdf"),
        pdf: signe,
        fichierExistantId: d.signeDriveFileId,
      });
    }
    if (d.signeDriveFileId && statut !== "SIGNE") {
      await rangerDocumentDevis({ fileId: d.signeDriveFileId, dossier: "Devis reçus", annee, sousDossier: SOUS_DOSSIER[statut] });
    }
  } catch (erreur) {
    console.error("Rangement du devis reçu impossible :", erreur);
    return { succes: false, message: messageDrive(erreur) };
  }
  await db.devisRecu.update({
    where: { id: d.id },
    data: {
      statut,
      decideLe: statut === "EN_ATTENTE" ? null : new Date(),
      motifAbandon: statut === "ABANDONNE" ? optionnel(fd, "motif", 300) : null,
      ...(depot ? { signeDriveFileId: depot.id, signeUrl: depot.url } : {}),
    },
  });
  revalider();
  return { succes: true, message: statut === "SIGNE" ? "Devis signé." : statut === "ABANDONNE" ? "Devis abandonné." : "Devis remis en attente." };
}

// Relie un devis signé à sa facture d'achat (rubrique Achats) : il passe « Facturé ».
export async function lierFactureDevisRecu(fd: FormData) {
  await exigerAdmin();
  const id = champ(fd, "id", 40);
  const factureId = optionnel(fd, "factureId", 40);
  await db.devisRecu.update({ where: { id }, data: { factureId } });
  revalider();
}

export async function supprimerDevisRecu(fd: FormData) {
  await exigerAdmin();
  const d = await db.devisRecu.findUnique({ where: { id: champ(fd, "id", 40) } });
  if (!d) return;
  for (const fileId of [d.driveFileId, d.signeDriveFileId].filter((x): x is string => !!x)) {
    try {
      await mettreALaCorbeilleDrive(fileId);
    } catch (erreur) {
      console.error("Mise à la corbeille du devis impossible :", erreur);
    }
  }
  await db.devisRecu.delete({ where: { id: d.id } });
  revalider();
}

// Correction d'un devis reçu (montant, objet, validité…) ; si le fournisseur ou la date
// changent, le fichier est renommé dans le Drive.
export async function modifierDevisRecu(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await exigerAdmin();
  const d = await db.devisRecu.findUnique({ where: { id: champ(fd, "id", 40) } });
  if (!d) return { succes: false, message: "Ce devis n'existe plus." };
  const fournisseur = champ(fd, "fournisseur", 80);
  if (!fournisseur) return { succes: false, message: "Le fournisseur est requis." };
  const date = dateOu(fd, "date", d.date);
  const montantBrut = champ(fd, "montant", 20);
  const montantCentimes = montantBrut ? lireCentimes(montantBrut) : null;
  if (montantBrut && montantCentimes === null) return { succes: false, message: "Montant invalide (ex. 1 250,00)." };
  const validite = champ(fd, "valableJusquAu", 10);

  const nomFichier = normaliserNomFichier(nomFichierFacture(date.toISOString().slice(0, 10), `${fournisseur} (devis)`));
  if (nomFichier !== d.nomFichier) {
    try {
      await renommerFichierDrive(d.driveFileId, nomFichier);
      if (d.signeDriveFileId) await renommerFichierDrive(d.signeDriveFileId, nomFichier.replace(/\.pdf$/i, " - signé.pdf"));
    } catch (erreur) {
      console.error("Renommage du devis dans le Drive impossible :", erreur);
      return { succes: false, message: "Le fichier n'a pas pu être renommé dans le Drive." };
    }
  }
  await db.devisRecu.update({
    where: { id: d.id },
    data: {
      fournisseur,
      date,
      montantCentimes,
      objet: optionnel(fd, "objet", 200),
      valableJusquAu: DATE_ISO.test(validite) ? versDate(validite) : null,
      nomFichier,
    },
  });
  revalider();
  return { succes: true, message: "Devis modifié." };
}
