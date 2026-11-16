"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { urlBase } from "@/lib/url";
import { scanEnPdf } from "@/lib/scanEnPdf";
import { mettreALaCorbeilleDrive } from "@/lib/drive";
import { archiverContrat, attendPresidence, empreinte, envoyerLienPresidence, prevenirProfs } from "@/lib/contratsServeur";

export type EtatAction = { succes: boolean; message?: string };

async function exigerDirection() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") throw new Error("Accès réservé à la direction.");
}

const champ = (fd: FormData, nom: string, max = 200) => String(fd.get(nom) ?? "").trim().slice(0, max);

function rafraichir() {
  revalidatePath("/admin/contrats");
  revalidatePath("/contrats");
  revalidatePath("/accueil");
}

// Dépôt du PDF d'un contrat ou avenant pour un prof et une année. Déjà signé sur papier : il
// est simplement archivé. Sinon il part (si demandé) à la présidence pour signature.
export async function ajouterContrat(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await exigerDirection();
  const prof = await db.user.findUnique({ where: { id: champ(fd, "profId", 40) }, select: { id: true } });
  if (!prof) return { succes: false, message: "Choisissez le prof." };
  const anneeDebut = Number(champ(fd, "anneeDebut", 4));
  if (!Number.isInteger(anneeDebut) || anneeDebut < 2000 || anneeDebut > 2100) return { succes: false, message: "Année scolaire invalide." };
  const type = champ(fd, "type", 10) === "AVENANT" ? "AVENANT" : "CONTRAT";
  const titre = champ(fd, "titre", 120);
  if (!titre) return { succes: false, message: "Donnez un titre (ex. « CDI temps partiel », « Avenant n°1 — heures »)." };
  const pdf = await scanEnPdf(fd, "fichiers");
  if (!pdf) return { succes: false, message: "Ajoutez le PDF du document." };
  if ("erreur" in pdf) return { succes: false, message: pdf.erreur };
  const papier = fd.get("papier") === "on";
  const envoyer = !papier && fd.get("envoyer") === "on";

  const c = await db.contratProf.create({
    data: {
      profId: prof.id,
      anneeDebut,
      type,
      titre,
      pdf: Uint8Array.from(pdf),
      nomFichier: `${titre}.pdf`,
      empreinte: empreinte(pdf),
      papier,
      envoyeLe: envoyer ? new Date() : null,
    },
  });

  let message = papier ? "Document archivé." : envoyer ? "Document ajouté." : "Document ajouté : envoyez-le à la présidence quand vous êtes prêt.";
  if (papier) {
    try {
      if (!(await archiverContrat(c.id))) message += " Le Drive n'a pas répondu : réessayez « Ranger dans le Drive » plus tard.";
    } catch (erreur) {
      console.error("Contrat papier non déposé dans le Drive :", erreur);
      message += " Le Drive n'a pas répondu : réessayez « Ranger dans le Drive » plus tard.";
    }
  }
  if (envoyer) {
    const erreur = await envoyerLienPresidence(await urlBase());
    message += erreur ? ` ${erreur}` : " La présidence a reçu le lien pour le signer.";
  }
  rafraichir();
  return { succes: true, message };
}

// Les documents pas encore envoyés passent à la présidence, qui reçoit (à nouveau) son lien.
export async function envoyerALaPresidence(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await exigerDirection();
  const id = champ(fd, "id", 40);
  await db.contratProf.updateMany({ where: { ...(id ? { id } : {}), papier: false, envoyeLe: null }, data: { envoyeLe: new Date() } });
  const erreur = await envoyerLienPresidence(await urlBase());
  rafraichir();
  if (erreur) return { succes: false, message: erreur };
  const n = await db.contratProf.count({ where: attendPresidence });
  return { succes: true, message: `Lien envoyé à la présidence (${n} document${n > 1 ? "s" : ""} à signer).` };
}

export async function relancerProf(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await exigerDirection();
  const n = await prevenirProfs([champ(fd, "id", 40)], await urlBase());
  return n ? { succes: true, message: "Renvoyé au prof." } : { succes: false, message: "Le mail n'a pas pu partir." };
}

export async function rangerDansLeDrive(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  await exigerDirection();
  try {
    if (await archiverContrat(champ(fd, "id", 40))) {
      rafraichir();
      return { succes: true, message: "Rangé dans le Drive." };
    }
  } catch (erreur) {
    console.error("Contrat non déposé dans le Drive :", erreur);
  }
  return { succes: false, message: "Le Drive n'a pas répondu : vérifiez la connexion Google dans Paramètres." };
}

// Retrait d'un document tant que personne ne l'a signé dans l'appli (ou d'un document papier,
// dont la copie du Drive part à la corbeille).
export async function supprimerContrat(fd: FormData) {
  await exigerDirection();
  const c = await db.contratProf.findUnique({ where: { id: champ(fd, "id", 40) }, select: { id: true, presidenceSigneLe: true, driveFileId: true } });
  if (!c || c.presidenceSigneLe) return;
  await db.contratProf.delete({ where: { id: c.id } });
  if (c.driveFileId) await mettreALaCorbeilleDrive(c.driveFileId).catch((e) => console.error("Corbeille Drive impossible :", e));
  rafraichir();
}
