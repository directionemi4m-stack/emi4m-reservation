"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export type EtatConnexion = {
  statut: "idle" | "erreur";
  message?: string;
};

export async function connecter(
  _etatPrecedent: EtatConnexion,
  formData: FormData
): Promise<EtatConnexion> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const motDePasse = String(formData.get("password") ?? "");

  if (!email || !motDePasse) {
    return { statut: "erreur", message: "Merci de renseigner votre email et votre mot de passe." };
  }

  try {
    await signIn("credentials", { email, password: motDePasse, redirectTo: "/" });
    return { statut: "idle" };
  } catch (erreur) {
    if (erreur instanceof AuthError) {
      return { statut: "erreur", message: "Email ou mot de passe incorrect." };
    }
    throw erreur;
  }
}
