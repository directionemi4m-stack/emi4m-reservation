"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { envoyerPush } from "@/lib/push";
import { LIBELLE_TYPE_IDEE, TEXTE_MAX, TITRE_MAX } from "@/lib/idees";

export type EtatAction = { succes: boolean; message?: string };

// Un prof envoie une idée pour l'école ou une demande d'amélioration de l'appli, à son nom
// ou anonymement (alors aucun auteur n'est enregistré, même pour la direction).
export async function envoyerIdee(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  const session = await auth();
  if (!session?.user) return { succes: false, message: "Non connecté." };
  if (session.user.impersonation) return { succes: false, message: "Impossible en mode « connecté en tant que »." };
  const type = fd.get("type") === "APPLI" ? "APPLI" : "ECOLE";
  const titre = String(fd.get("titre") ?? "").trim().slice(0, TITRE_MAX);
  const texte = String(fd.get("texte") ?? "").trim().slice(0, TEXTE_MAX);
  if (!titre) return { succes: false, message: "Donnez un titre à votre idée." };
  if (!texte) return { succes: false, message: "Décrivez votre idée en quelques mots." };
  const anonyme = fd.get("anonyme") === "on";

  await db.idee.create({ data: { type, titre, texte, auteurId: anonyme ? null : session.user.id } });
  const direction = await db.user.findMany({ where: { role: "ADMIN", actif: true }, select: { id: true } });
  await envoyerPush(
    direction.map((d) => d.id).filter((id) => id !== session.user.id),
    { titre: `Boîte à idées : ${LIBELLE_TYPE_IDEE[type].toLowerCase()}`, corps: titre, url: "/admin/idees" }
  ).catch((e) => console.error("Notification « nouvelle idée » non envoyée :", e));
  revalidatePath("/idees");
  revalidatePath("/admin/idees");
  revalidatePath("/accueil");
  return {
    succes: true,
    message: anonyme ? "Merci ! Votre idée est envoyée anonymement à la direction." : "Merci ! Votre idée est envoyée : vous verrez ici la réponse de la direction.",
  };
}
