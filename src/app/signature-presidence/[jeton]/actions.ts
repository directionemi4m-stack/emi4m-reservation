"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { urlBase } from "@/lib/url";
import { lireSignature } from "@/lib/bulletinsCham";
import { attendPresidence, lienPresidenceValide, prevenirProfs } from "@/lib/contratsServeur";

export type EtatAction = { succes: boolean; message?: string };

// La présidence paraphe et signe, en une fois, les documents cochés ; chaque prof reçoit
// ensuite le sien pour signer à son tour.
export async function signerPourLaPresidence(_etat: EtatAction, fd: FormData): Promise<EtatAction> {
  const p = await lienPresidenceValide(String(fd.get("jeton") ?? ""));
  if (!p) return { succes: false, message: "Ce lien n'est plus valable. Demandez à la direction de vous en renvoyer un." };
  const ids = fd.getAll("ids").map(String).filter((x) => /^[a-z0-9]{10,40}$/.test(x));
  if (ids.length === 0) return { succes: false, message: "Cochez au moins un document." };
  if (fd.get("lu") !== "on") return { succes: false, message: "Cochez « Lu et approuvé »." };
  const paraphe = lireSignature(String(fd.get("paraphe") ?? ""));
  if (!paraphe) return { succes: false, message: "Paraphez (vos initiales) dans le premier cadre." };
  const signature = lireSignature(String(fd.get("signature") ?? ""));
  if (!signature) return { succes: false, message: "Signez dans le second cadre." };

  const aSigner = await db.contratProf.findMany({ where: { id: { in: ids }, ...attendPresidence }, select: { id: true } });
  const maintenant = new Date();
  await db.contratProf.updateMany({
    where: { id: { in: aSigner.map((c) => c.id) }, ...attendPresidence },
    data: {
      presidenceNom: p.nom,
      presidenceQualite: p.qualite,
      presidenceEmail: p.email,
      presidenceParaphe: Uint8Array.from(paraphe),
      presidenceSignature: Uint8Array.from(signature),
      presidenceSigneLe: maintenant,
    },
  });
  const envoyes = await prevenirProfs(
    aSigner.map((c) => c.id),
    await urlBase()
  );
  revalidatePath("/admin/contrats");
  revalidatePath("/contrats");
  revalidatePath("/accueil");
  const n = aSigner.length;
  return {
    succes: true,
    message: `Merci : ${n} document${n > 1 ? "s" : ""} signé${n > 1 ? "s" : ""}. ${envoyes === n ? "Chaque prof a reçu le sien par mail pour le signer à son tour." : `${envoyes} prof${envoyes > 1 ? "s" : ""} prévenu${envoyes > 1 ? "s" : ""} par mail ; la direction relancera les autres.`}`,
  };
}
