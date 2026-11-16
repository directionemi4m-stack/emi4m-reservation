"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { urlBase } from "@/lib/url";
import { envoyerPush } from "@/lib/push";
import { envoyerMailSuiteIdee } from "@/lib/mail";
import { LIBELLE_STATUT_IDEE, REPONSE_MAX, type StatutIdee } from "@/lib/idees";

export type EtatAction = { succes: boolean; message?: string };

// La direction fait avancer une idée (statut) et peut y répondre ; l'auteur, s'il n'est pas
// anonyme, est prévenu quand quelque chose change (et seulement si c'est demandé).
export async function traiterIdee(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return { succes: false, message: "Accès réservé à la direction." };
  const idee = await db.idee.findUnique({ where: { id: String(fd.get("id") ?? "") }, include: { auteur: { select: { id: true, prenom: true, email: true } } } });
  if (!idee) return { succes: false, message: "Cette idée n'existe plus." };
  const statutLu = String(fd.get("statut") ?? "");
  const statut = (statutLu in LIBELLE_STATUT_IDEE ? statutLu : idee.statut) as StatutIdee;
  const reponse = String(fd.get("reponse") ?? "").trim().slice(0, REPONSE_MAX) || null;
  const change = statut !== idee.statut || reponse !== idee.reponse;
  if (!change) return { succes: true, message: "Rien n'a changé." };

  await db.idee.update({
    where: { id: idee.id },
    data: { statut, reponse, reponduLe: reponse !== idee.reponse ? (reponse ? new Date() : null) : idee.reponduLe },
  });

  let suite = "";
  if (idee.auteur && fd.get("prevenir") === "on") {
    try {
      await envoyerMailSuiteIdee({ prof: idee.auteur, titre: idee.titre, statut: LIBELLE_STATUT_IDEE[statut].toLowerCase(), reponse, url: `${await urlBase()}/idees` });
      suite = ` Mail envoyé à ${idee.auteur.prenom}.`;
    } catch (erreur) {
      console.error("Mail de suite d'une idée non envoyé :", erreur);
      suite = " Le mail au prof n'a pas pu partir.";
    }
    await envoyerPush([idee.auteur.id], { titre: "Boîte à idées", corps: `« ${idee.titre} » : ${LIBELLE_STATUT_IDEE[statut].toLowerCase()}`, url: "/idees" }).catch(() => 0);
  }
  revalidatePath("/admin/idees");
  revalidatePath("/idees");
  revalidatePath("/accueil");
  return { succes: true, message: `Enregistré.${suite}` };
}
