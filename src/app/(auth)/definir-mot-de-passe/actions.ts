"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";
import { signIn } from "@/lib/auth";
import { verifierTokenMotDePasse, consommerTokenMotDePasse } from "@/lib/tokensMotDePasse";

export type EtatDefinitionMotDePasse = {
  statut: "idle" | "erreur";
  message?: string;
};

export async function definirMotDePasse(
  _etatPrecedent: EtatDefinitionMotDePasse,
  formData: FormData
): Promise<EtatDefinitionMotDePasse> {
  const token = String(formData.get("token") ?? "");
  const motDePasse = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (motDePasse.length < 8) {
    return { statut: "erreur", message: "Le mot de passe doit contenir au moins 8 caractères." };
  }
  if (motDePasse !== confirmation) {
    return { statut: "erreur", message: "Les deux mots de passe ne correspondent pas." };
  }

  const compte = await verifierTokenMotDePasse(token);
  if (!compte) {
    return {
      statut: "erreur",
      message: "Ce lien n'est plus valide : il a déjà été utilisé ou a expiré. Redemandez-en un.",
    };
  }

  const motDePasseHash = await bcrypt.hash(motDePasse, 12);
  await db.user.update({ where: { id: compte.id }, data: { motDePasseHash } });
  await consommerTokenMotDePasse(token);

  try {
    await signIn("credentials", { email: compte.email, password: motDePasse, redirectTo: "/" });
    return { statut: "idle" };
  } catch (erreur) {
    if (erreur instanceof AuthError) {
      return { statut: "erreur", message: "Mot de passe enregistré, mais la connexion automatique a échoué. Connectez-vous manuellement." };
    }
    throw erreur;
  }
}
