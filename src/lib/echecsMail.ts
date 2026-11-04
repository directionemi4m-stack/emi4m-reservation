import { db } from "@/lib/db";

// Note un mail qui n'est pas parti, pour que la direction le voie et prévienne la personne
// autrement (cf. bandeau de « À traiter »). Ne fait jamais échouer l'action en cours.
export async function noterEchecMail(params: { destinataire: string; objet: string; detail: string }, erreur: unknown) {
  console.error(`Échec d'envoi du mail « ${params.objet} » :`, erreur);
  try {
    await db.echecMail.create({ data: params });
  } catch (e) {
    console.error("Échec de mail non enregistré :", e);
  }
}
