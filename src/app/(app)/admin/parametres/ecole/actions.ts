"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { urlBase } from "@/lib/url";
import { attendPresidence, envoyerLienPresidence } from "@/lib/contratsServeur";

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
    mentionTva: texte(formData, "mentionTva", 200),
    conditionsPaiement: texte(formData, "conditionsPaiement", 500),
    mentionsFacture: texte(formData, "mentionsFacture", 800),
    iban: texte(formData, "iban", 40),
    bic: texte(formData, "bic", 20),
    presidenceNom: texte(formData, "presidenceNom", 120),
    presidenceQualite: texte(formData, "presidenceQualite", 80),
    presidenceEmail: texte(formData, "presidenceEmail", 200)?.toLowerCase() ?? null,
  };
  if (donnees.presidenceEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donnees.presidenceEmail)) {
    return { succes: false, message: "Le mail de la présidence n'est pas valide." };
  }
  const avant = await db.coordonneesEcole.findUnique({ where: { id: "singleton" }, select: { presidenceNom: true, presidenceEmail: true } });
  await db.coordonneesEcole.upsert({ where: { id: "singleton" }, create: donnees, update: donnees });

  // Changement de présidence : l'ancien lien de signature ne vaut plus, et les documents en
  // attente partent tout de suite à la nouvelle présidence.
  let suite = "";
  if ((avant?.presidenceEmail ?? null) !== donnees.presidenceEmail || (avant?.presidenceNom ?? null) !== donnees.presidenceNom) {
    await db.lienPresidence.deleteMany({});
    if (donnees.presidenceEmail && donnees.presidenceNom && (await db.contratProf.count({ where: attendPresidence })) > 0) {
      const erreur = await envoyerLienPresidence(await urlBase());
      suite = erreur ? ` ${erreur}` : " Les contrats en attente ont été envoyés à la nouvelle présidence.";
    }
    revalidatePath("/admin/contrats");
  }
  revalidatePath("/admin/parametres/ecole");
  revalidatePath("/admin/sacem");
  revalidatePath("/admin/devis", "layout");
  return { succes: true, message: `Coordonnées enregistrées.${suite}` };
}
