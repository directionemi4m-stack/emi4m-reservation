"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

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

  await db.user.create({ data: { email, prenom, nom, role } });
  revalidatePath("/admin/parametres/profs");

  return { statut: "succes", message: `${prenom} ${nom} a été ajouté·e avec succès.` };
}

export async function basculerActifProf(formData: FormData) {
  await exigerAdmin();

  const profId = String(formData.get("profId"));
  const actif = formData.get("actif") === "true";

  await db.user.update({ where: { id: profId }, data: { actif } });
  revalidatePath("/admin/parametres/profs");
}
