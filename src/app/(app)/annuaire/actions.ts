"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type EtatAction = { succes: boolean; message?: string };

export async function modifierCoordonnees(
  _etatPrecedent: EtatAction,
  formData: FormData
): Promise<EtatAction> {
  const session = await auth();
  if (!session?.user) return { succes: false, message: "Non connecté." };

  const telephonePartage = String(formData.get("telephonePartage") ?? "").trim() || null;
  const emailPartage = String(formData.get("emailPartage") ?? "").trim() || null;

  await db.user.update({
    where: { id: session.user.id },
    data: { telephonePartage, emailPartage },
  });

  revalidatePath("/annuaire");
  return { succes: true, message: "Coordonnées enregistrées." };
}
