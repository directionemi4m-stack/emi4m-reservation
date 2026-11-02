"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dechiffrerCode } from "@/lib/codesAlarme";
import { lireSignature } from "@/lib/bulletinsCham";
import { deposerCopieSignee, regenererRegistreDocument } from "@/lib/documentsSignesServeur";

export type ResultatCode = { code?: string; message?: string };

// Le code n'est jamais rendu dans la page : il n'est déchiffré et renvoyé qu'au clic sur
// « Afficher », et uniquement à son propriétaire.
export async function revelerMonCode(): Promise<ResultatCode> {
  const session = await auth();
  if (!session?.user) return { message: "Non connecté." };
  // En « Se connecter en tant que », la direction voit l'appli comme le collègue : on ne
  // lui montre pas pour autant son code personnel.
  if (session.user.impersonation) {
    return { message: "Code masqué en mode « Se connecter en tant que »." };
  }

  const ligne = await db.codeAlarme.findUnique({ where: { userId: session.user.id } });
  if (!ligne) return { message: "Aucun code enregistré pour vous." };

  try {
    return { code: dechiffrerCode(ligne.codeChiffre) };
  } catch (erreur) {
    console.error("Déchiffrement d'un code d'alarme impossible :", erreur);
    return { message: "Code illisible, demandez à la direction de le ressaisir." };
  }
}

// --- Documents à lire et signer ---

export type EtatAction = { succes: boolean; message?: string };

export async function signerDocument(_etat: EtatAction, formData: FormData): Promise<EtatAction> {
  const session = await auth();
  if (!session?.user) return { succes: false, message: "Non connecté." };
  // Une signature engage la personne : impossible en mode « connecté en tant que ».
  if (session.user.impersonation) {
    return { succes: false, message: "Signature impossible en mode « connecté en tant que » : seul le prof peut signer." };
  }

  const documentId = String(formData.get("documentId") ?? "");
  const version = Number(formData.get("version"));
  const document = await db.documentASigner.findUnique({ where: { id: documentId }, select: { id: true, version: true, retireLe: true } });
  if (!document || document.retireLe) return { succes: false, message: "Ce document n'est plus à signer." };
  if (document.version !== version) {
    return { succes: false, message: "Une nouvelle version du document vient d'être publiée : rechargez la page et relisez-la." };
  }
  if (formData.get("lu") !== "on") return { succes: false, message: "Cochez la case pour confirmer votre lecture." };
  const signature = lireSignature(String(formData.get("signature") ?? ""));
  if (!signature) return { succes: false, message: "Signez dans le cadre." };

  const userId = session.user.id;
  const existante = await db.signatureDocument.findUnique({
    where: { documentId_version_userId: { documentId, version, userId } },
    select: { id: true },
  });
  if (existante) return { succes: true, message: "Vous avez déjà signé ce document." };
  const signee = await db.signatureDocument.create({ data: { documentId, version, userId, image: new Uint8Array(signature) } });

  // Les PDF du Drive ne sont que des copies : une erreur Google ne fait pas échouer la
  // signature (la direction peut les rattraper depuis sa page).
  let avertissement: string | undefined;
  try {
    const copie = await deposerCopieSignee(signee.id);
    const registre = await regenererRegistreDocument(documentId);
    if (!copie || !registre) avertissement = "Signature enregistrée. La copie PDF sera rangée dans le Drive un peu plus tard.";
  } catch (erreur) {
    console.error("Dépôt du document signé dans le Drive impossible :", erreur);
    avertissement = "Signature enregistrée. La copie PDF sera rangée dans le Drive un peu plus tard.";
  }
  revalidatePath("/securite");
  revalidatePath("/accueil");
  revalidatePath("/admin/documents");
  return { succes: true, message: avertissement ?? "Merci, votre signature est enregistrée." };
}
