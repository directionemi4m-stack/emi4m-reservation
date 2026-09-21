"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { envoyerMailBienvenue, envoyerMailReinitialisationMotDePasse } from "@/lib/mail";
import { genererTokenMotDePasse, DUREE_INVITATION_MS } from "@/lib/tokensMotDePasse";
import { urlBase } from "@/lib/url";

export type EtatAjoutProf = {
  statut: "idle" | "succes" | "erreur";
  message?: string;
};

async function exigerAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    throw new Error("Accès réservé à la direction.");
  }
}

export async function ajouterProf(
  _etatPrecedent: EtatAjoutProf,
  formData: FormData
): Promise<EtatAjoutProf> {
  await exigerAdmin();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const prenom = String(formData.get("prenom") ?? "").trim();
  const nom = String(formData.get("nom") ?? "").trim();
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "PROF";

  if (!email || !email.includes("@") || !prenom || !nom) {
    return {
      statut: "erreur",
      message: "Merci de renseigner un email valide, un prénom et un nom.",
    };
  }

  const existant = await db.user.findUnique({ where: { email } });
  if (existant) {
    return { statut: "erreur", message: "Un compte existe déjà avec cet email." };
  }

  const prof = await db.user.create({ data: { email, prenom, nom, role } });
  revalidatePath("/admin/parametres/profs");

  try {
    const token = await genererTokenMotDePasse(prof.id, DUREE_INVITATION_MS);
    const urlDefinirMotDePasse = `${await urlBase()}/definir-mot-de-passe?token=${token}`;
    await envoyerMailBienvenue({ prof, urlDefinirMotDePasse });
  } catch (erreur) {
    console.error("Échec d'envoi du mail de bienvenue :", erreur);
    return {
      statut: "succes",
      message: `${prenom} ${nom} a été ajouté·e, mais l'envoi du mail de bienvenue a échoué.`,
    };
  }

  return {
    statut: "succes",
    message: `${prenom} ${nom} a été ajouté·e, un email de bienvenue lui a été envoyé.`,
  };
}

// Renvoie un lien valable 7 jours : invitation de bienvenue si le prof n'a jamais
// défini de mot de passe, sinon lien de réinitialisation (compte déjà activé).
export async function renvoyerLienProf(
  _etatPrecedent: EtatAjoutProf,
  formData: FormData
): Promise<EtatAjoutProf> {
  await exigerAdmin();

  const prof = await db.user.findUnique({ where: { id: String(formData.get("profId")) } });
  if (!prof) return { statut: "erreur", message: "Ce compte n'existe plus." };
  if (!prof.actif) {
    return { statut: "erreur", message: "Compte désactivé : activez-le d'abord." };
  }

  try {
    const token = await genererTokenMotDePasse(prof.id, DUREE_INVITATION_MS);
    const urlDefinirMotDePasse = `${await urlBase()}/definir-mot-de-passe?token=${token}`;
    if (prof.motDePasseHash) {
      await envoyerMailReinitialisationMotDePasse({ prof, urlDefinirMotDePasse, validite: "7 jours" });
    } else {
      await envoyerMailBienvenue({ prof, urlDefinirMotDePasse });
    }
  } catch (erreur) {
    console.error("Échec du renvoi du lien de mot de passe :", erreur);
    return { statut: "erreur", message: "L'envoi du mail a échoué. Réessayez." };
  }

  return { statut: "succes", message: `Lien envoyé à ${prof.email} (valable 7 jours).` };
}

export async function basculerActifProf(formData: FormData) {
  await exigerAdmin();

  const profId = String(formData.get("profId"));
  const actif = formData.get("actif") === "true";

  await db.user.update({ where: { id: profId }, data: { actif } });
  revalidatePath("/admin/parametres/profs");
}

export async function supprimerProf(
  _etatPrecedent: EtatAjoutProf,
  formData: FormData
): Promise<EtatAjoutProf> {
  await exigerAdmin();

  const profId = String(formData.get("profId"));

  try {
    await db.user.delete({ where: { id: profId } });
  } catch (erreur) {
    if (
      erreur &&
      typeof erreur === "object" &&
      "code" in erreur &&
      (erreur.code === "P2003" || erreur.code === "P2039")
    ) {
      return {
        statut: "erreur",
        message:
          "Impossible de supprimer : ce compte a des demandes ou créneaux récurrents liés. Désactivez-le à la place.",
      };
    }
    throw erreur;
  }

  revalidatePath("/admin/parametres/profs");
  return { statut: "succes" };
}
