"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lireSignature } from "@/lib/bulletinsCham";
import { MAIL_DIRECTION } from "@/lib/clesServeur";
import { finaliserContrat } from "@/lib/contratsServeur";

export type EtatAction = { succes: boolean; message?: string };

// Le prof paraphe et signe son contrat (déjà signé par la présidence) sur son téléphone.
export async function signerMonContrat(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  const session = await auth();
  if (!session?.user) return { succes: false, message: "Non connecté." };
  if (session.user.impersonation) return { succes: false, message: "Signature impossible en mode « connecté en tant que » : seul le prof peut signer." };
  if (session.user.email === MAIL_DIRECTION) return { succes: false, message: "Le compte partagé de la direction ne signe pas." };

  const c = await db.contratProf.findUnique({ where: { id: String(fd.get("id") ?? "") }, select: { id: true, profId: true, presidenceSigneLe: true, profSigneLe: true } });
  if (!c || c.profId !== session.user.id) return { succes: false, message: "Document introuvable." };
  if (c.profSigneLe) return { succes: true, message: "Vous avez déjà signé ce document." };
  if (!c.presidenceSigneLe) return { succes: false, message: "Ce document n'est pas encore signé par la présidence." };
  if (fd.get("lu") !== "on") return { succes: false, message: "Cochez « Lu et approuvé »." };
  const paraphe = lireSignature(String(fd.get("paraphe") ?? ""));
  if (!paraphe) return { succes: false, message: "Paraphez (vos initiales) dans le premier cadre." };
  const signature = lireSignature(String(fd.get("signature") ?? ""));
  if (!signature) return { succes: false, message: "Signez dans le second cadre." };

  const { count } = await db.contratProf.updateMany({
    where: { id: c.id, profSigneLe: null },
    data: { profParaphe: Uint8Array.from(paraphe), profSignature: Uint8Array.from(signature), profSigneLe: new Date() },
  });
  if (count === 0) return { succes: true, message: "Vous avez déjà signé ce document." };
  const notes = await finaliserContrat(c.id);
  revalidatePath("/contrats");
  revalidatePath("/admin/contrats");
  revalidatePath("/accueil");
  return {
    succes: true,
    message: `Merci, c'est signé. Votre exemplaire signé par les deux vous est envoyé par mail.${notes.length ? ` (${notes.join(" ; ")}.)` : ""}`,
  };
}
