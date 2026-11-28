"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { envoyerDeclarationSacem } from "@/lib/declarationSacemServeur";
import { lireEuros } from "@/lib/inventaire";

export type EtatAction = { succes: boolean; message?: string };

const champ = (fd: FormData, nom: string, max = 200) => String(fd.get(nom) ?? "").trim().slice(0, max);

function lireEntier(t: string): number | null | undefined {
  if (!t) return null;
  return /^\d{1,6}$/.test(t) ? Number(t) : undefined;
}

// Entrée, fréquentation, recettes et dépenses d'une représentation ; avec « envoyer », la
// déclaration est aussitôt refaite, rangée dans le Drive et envoyée à la direction.
export async function enregistrerDeclarationSacem(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return { succes: false, message: "Accès réservé à la direction." };
  const e = await db.evenementSaison.findUnique({ where: { id: champ(fd, "id", 40) }, select: { id: true } });
  if (!e) return { succes: false, message: "Cette représentation n'existe plus." };

  const entrees = lireEntier(champ(fd, "entrees", 10));
  const jauge = lireEntier(champ(fd, "jauge", 10));
  if (entrees === undefined || jauge === undefined) return { succes: false, message: "Spectateurs et jauge : un nombre entier." };
  const montants: Record<string, number | null> = {};
  for (const nom of ["recettes", "recettesAnnexes", "depenses"]) {
    const t = champ(fd, nom, 20);
    const v = t ? lireEuros(t) : null;
    if (t && v === null) return { succes: false, message: "Montant invalide (ex. 350 ou 49,80)." };
    montants[nom] = v;
  }
  const entreePayante = fd.get("entreePayante") === "1";
  await db.evenementSaison.update({
    where: { id: e.id },
    data: {
      sacemEntreePayante: entreePayante,
      sacemTarifs: entreePayante ? champ(fd, "tarifs") || null : null,
      sacemEntrees: entrees,
      sacemJauge: jauge,
      sacemRecettesCentimes: entreePayante ? montants.recettes : null,
      sacemRecettesAnnexesCentimes: montants.recettesAnnexes,
      sacemDepensesCentimes: montants.depenses,
    },
  });

  let message = "Enregistré.";
  if (fd.get("envoyer") === "1") {
    const domaine = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    const h = await headers();
    const base = domaine ? `https://${domaine}` : `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
    try {
      const r = await envoyerDeclarationSacem(e.id, base);
      message = r.drive ? "Déclaration envoyée à la direction et rangée dans le Drive." : "Déclaration envoyée à la direction (Drive indisponible pour le moment).";
    } catch (erreur) {
      console.error("Envoi de la déclaration SACEM impossible :", erreur);
      return { succes: false, message: "Enregistré, mais l'envoi a échoué. Réessayez dans quelques instants." };
    }
  }
  revalidatePath("/admin/sacem");
  return { succes: true, message };
}
