"use server";

import { db } from "@/lib/db";
import { signIn } from "@/lib/auth";

export type EtatDemandeLien = {
  statut: "idle" | "envoye" | "erreur";
  message?: string;
};

const MESSAGE_GENERIQUE =
  "Si cette adresse est associée à un compte EMI4M actif, un lien de connexion vient de vous être envoyé.";

export async function demanderLien(
  _etatPrecedent: EtatDemandeLien,
  formData: FormData
): Promise<EtatDemandeLien> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    return { statut: "erreur", message: "Adresse email invalide." };
  }

  try {
    const compte = await db.user.findUnique({ where: { email } });

    // On ne déclenche l'envoi que si le compte existe et est actif, mais on
    // renvoie toujours le même message pour ne pas révéler qui a un compte.
    if (compte?.actif) {
      await signIn("nodemailer", { email, redirect: false });
    }
  } catch (erreur) {
    console.error("Échec d'envoi du lien de connexion :", erreur);
  }

  return { statut: "envoye", message: MESSAGE_GENERIQUE };
}
