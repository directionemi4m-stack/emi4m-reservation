"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CLE_REGLEMENT } from "@/lib/documentsEcole";

export type EtatAction = { succes: boolean; message?: string };

// Le corps d'une requête est limité à 4,5 Mo sur l'hébergement : le PDF doit tenir dessous.
const TAILLE_MAX = 4 * 1024 * 1024;
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

// Dépose (ou remplace) le PDF du règlement intérieur et/ou change la date de sa dernière
// mise à jour. Réservé à la direction.
export async function enregistrerReglement(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return { succes: false, message: "Réservé à la direction." };

  const dateTexte = String(fd.get("majLe") ?? "").trim();
  const majLe = DATE_ISO.test(dateTexte) ? new Date(`${dateTexte}T00:00:00.000Z`) : null;
  if (!majLe || Number.isNaN(majLe.getTime())) return { succes: false, message: "Indiquez la date de la dernière mise à jour." };

  const fichier = fd.get("pdf");
  let pdf: Buffer | null = null;
  let nomFichier = "";
  if (fichier instanceof File && fichier.size > 0) {
    if (fichier.size > TAILLE_MAX) return { succes: false, message: "PDF trop lourd (4 Mo au plus) : compressez-le avant de le déposer." };
    pdf = Buffer.from(await fichier.arrayBuffer());
    if (pdf.subarray(0, 5).toString() !== "%PDF-") return { succes: false, message: "Ce fichier n'est pas un PDF." };
    nomFichier = fichier.name.replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 120) || "Règlement intérieur.pdf";
  }

  const existant = await db.documentEcole.findUnique({ where: { cle: CLE_REGLEMENT }, select: { cle: true } });
  if (!existant && !pdf) return { succes: false, message: "Choisissez le PDF du règlement intérieur." };

  if (existant) {
    await db.documentEcole.update({
      where: { cle: CLE_REGLEMENT },
      data: { majLe, ...(pdf ? { pdf: Uint8Array.from(pdf), nomFichier, deposeLe: new Date() } : {}) },
    });
  } else {
    await db.documentEcole.create({ data: { cle: CLE_REGLEMENT, titre: "Règlement intérieur", pdf: Uint8Array.from(pdf!), nomFichier, majLe } });
  }
  revalidatePath("/reglement-interieur");
  return { succes: true, message: pdf ? "Nouveau PDF en ligne pour les profs." : "Date de mise à jour enregistrée." };
}
