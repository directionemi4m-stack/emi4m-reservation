"use server";

import { db } from "@/lib/db";
import { genererTokenMotDePasse } from "@/lib/tokensMotDePasse";
import { envoyerMailReinitialisationMotDePasse } from "@/lib/mail";
import { urlBase } from "@/lib/url";

export type EtatDemandeReinitialisation = {
  statut: "idle" | "envoye";
};

export async function demanderReinitialisation(
  _etatPrecedent: EtatDemandeReinitialisation,
  formData: FormData
): Promise<EtatDemandeReinitialisation> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  // On ne révèle jamais si un compte existe ou non : même message dans tous les cas.
  if (email && email.includes("@")) {
    try {
      const compte = await db.user.findUnique({ where: { email } });
      if (compte?.actif) {
        const token = await genererTokenMotDePasse(compte.id);
        const urlDefinirMotDePasse = `${await urlBase()}/definir-mot-de-passe?token=${token}`;
        await envoyerMailReinitialisationMotDePasse({ prof: compte, urlDefinirMotDePasse });
      }
    } catch (erreur) {
      console.error("Échec d'envoi du mail de réinitialisation :", erreur);
    }
  }

  return { statut: "envoye" };
}
