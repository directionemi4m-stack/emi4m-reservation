"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dechiffrerCode } from "@/lib/codesAlarme";

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
