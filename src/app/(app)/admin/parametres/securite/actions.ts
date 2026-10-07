"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chiffrerCode, codeValide, dechiffrerCode } from "@/lib/codesAlarme";
import { lignes, lireContact, SITE_VILLARD, type ConsignesContenu } from "@/lib/consignesSecurite";

export type EtatAction = { succes: boolean; message?: string };

async function exigerAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    throw new Error("Accès réservé à la direction.");
  }
}

function champ(formData: FormData, nom: string) {
  return String(formData.get(nom) ?? "").trim();
}

export async function enregistrerConsignes(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();

  const contenu: ConsignesContenu = {
    nomEtablissement: champ(formData, "nomEtablissement"),
    adresse: champ(formData, "adresse"),
    incendie: {
      prevenir: lignes(champ(formData, "prevenir")).map(lireContact),
      numeroSecours: champ(formData, "incendieNumero"),
      equipiers: lignes(champ(formData, "equipiers")),
    },
    evacuation: {
      pointRassemblement: champ(formData, "pointRassemblement"),
      guideFile: champ(formData, "guideFile"),
      serreFile: champ(formData, "serreFile"),
    },
    accident: {
      numeroSecours: champ(formData, "accidentNumero"),
      defibrillateur: champ(formData, "defibrillateur"),
      secouristes: lignes(champ(formData, "secouristes")),
      trousseUrgence: champ(formData, "trousseUrgence"),
    },
  };

  if (!contenu.incendie.numeroSecours || !contenu.accident.numeroSecours) {
    return { succes: false, message: "Les numéros des secours sont obligatoires." };
  }
  if (!contenu.evacuation.pointRassemblement) {
    return { succes: false, message: "Le point de rassemblement est obligatoire." };
  }

  await db.consignesSecurite.upsert({
    where: { site: SITE_VILLARD },
    create: { site: SITE_VILLARD, contenu: contenu as object },
    update: { contenu: contenu as object },
  });

  revalidatePath("/securite");
  revalidatePath("/admin/parametres/securite");
  return { succes: true, message: "Consignes enregistrées." };
}

export async function enregistrerCodeAlarme(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();

  const userId = champ(formData, "userId");
  const code = champ(formData, "code");
  if (!codeValide(code)) {
    return { succes: false, message: "Code invalide (2 à 20 chiffres/lettres, sans espace)." };
  }
  const salarie = await db.user.findUnique({ where: { id: userId } });
  if (!salarie) return { succes: false, message: "Ce compte n'existe plus." };

  const codeChiffre = chiffrerCode(code);
  await db.codeAlarme.upsert({
    where: { userId },
    create: { userId, codeChiffre },
    update: { codeChiffre },
  });

  revalidatePath("/admin/parametres/securite");
  return { succes: true, message: "Code enregistré." };
}

export async function supprimerCodeAlarme(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  await exigerAdmin();
  await db.codeAlarme.deleteMany({ where: { userId: champ(formData, "userId") } });
  revalidatePath("/admin/parametres/securite");
  return { succes: true };
}

// Relecture ponctuelle par la direction (pour vérifier une saisie), jamais rendue d'office.
export async function revelerCodeAlarme(userId: string): Promise<{ code?: string; message?: string }> {
  await exigerAdmin();
  const ligne = await db.codeAlarme.findUnique({ where: { userId } });
  if (!ligne) return { message: "Aucun code." };
  try {
    return { code: dechiffrerCode(ligne.codeChiffre) };
  } catch {
    return { message: "Code illisible, à ressaisir." };
  }
}
