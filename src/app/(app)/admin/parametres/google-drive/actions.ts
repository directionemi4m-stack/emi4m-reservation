"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { lancerSauvegarde } from "@/lib/sauvegardeServeur";
import { urlBase } from "@/lib/url";

export async function sauvegarderMaintenant(): Promise<{ succes: boolean; message: string }> {
  const session = await auth();
  if (session?.user.role !== "ADMIN") throw new Error("Accès réservé à la direction.");
  const r = await lancerSauvegarde(await urlBase());
  revalidatePath("/admin/parametres/google-drive");
  return r.ok
    ? { succes: true, message: `Sauvegarde déposée dans le Drive (${(r.taille / 1024 / 1024).toFixed(1).replace(".", ",")} Mo).` }
    : { succes: false, message: `Échec : ${r.erreur}` };
}
