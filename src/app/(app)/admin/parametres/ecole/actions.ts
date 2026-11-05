"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type EtatAction = { succes: boolean; message?: string };

const texte = (formData: FormData, nom: string, max = 300) => String(formData.get(nom) ?? "").trim().slice(0, max) || null;

export async function enregistrerCoordonnees(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return { succes: false, message: "Accès réservé à la direction." };

  const nom = texte(formData, "nom");
  const sigle = texte(formData, "sigle", 30);
  const adresse = texte(formData, "adresse", 500);
  if (!nom || !sigle || !adresse) return { succes: false, message: "Le nom, le sigle et l'adresse sont requis." };
  const siret = texte(formData, "siret", 30);
  if (siret && siret.replace(/\s/g, "").length !== 14) return { succes: false, message: "Le SIRET compte 14 chiffres." };

  const donnees = {
    nom,
    sigle,
    adresse,
    telephone: texte(formData, "telephone", 40),
    email: texte(formData, "email", 200),
    siteWeb: texte(formData, "siteWeb", 200),
    siret,
    numeroSacem: texte(formData, "numeroSacem", 40),
    representant: texte(formData, "representant", 200),
  };
  await db.coordonneesEcole.upsert({ where: { id: "singleton" }, create: donnees, update: donnees });
  revalidatePath("/admin/parametres/ecole");
  revalidatePath("/admin/sacem");
  return { succes: true, message: "Coordonnées enregistrées." };
}
