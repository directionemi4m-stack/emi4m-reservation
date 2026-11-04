"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { estEtapeManuelle } from "@/lib/rentree";

export async function basculerEtapeRentree(formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") throw new Error("Accès réservé à la direction.");
  const saison = Number(formData.get("saison"));
  const cle = String(formData.get("cle") ?? "");
  if (!Number.isInteger(saison) || !estEtapeManuelle(cle)) return;
  if (formData.get("faite") === "true") {
    await db.etapeRentree.upsert({ where: { saison_cle: { saison, cle } }, create: { saison, cle }, update: {} });
  } else {
    await db.etapeRentree.deleteMany({ where: { saison, cle } });
  }
  revalidatePath("/admin/rentree");
}
