"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { envoyerPush } from "@/lib/push";

export type ResultatPush = { succes: boolean; message?: string };

interface AbonnementSerialise {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

// Enregistre l'appareil courant pour recevoir les notifications de l'utilisateur connecté.
// Refusé en mode « connecté en tant que » : l'appareil de la direction recevrait sinon les
// notifications du prof.
export async function abonnerPush(abonnement: AbonnementSerialise): Promise<ResultatPush> {
  const session = await auth();
  if (!session?.user) return { succes: false, message: "Non connecté." };
  if (session.user.impersonation) {
    return { succes: false, message: "Impossible en mode « connecté en tant que »." };
  }

  const { endpoint, keys } = abonnement ?? {};
  if (!endpoint || !/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !keys?.p256dh || !keys.auth) {
    return { succes: false, message: "Abonnement invalide." };
  }

  await db.abonnementPush.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: session.user.id },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: session.user.id },
  });
  return { succes: true };
}

export async function desabonnerPush(endpoint: string): Promise<ResultatPush> {
  const session = await auth();
  if (!session?.user) return { succes: false };
  await db.abonnementPush.deleteMany({ where: { endpoint, userId: session.user.id } });
  return { succes: true };
}

export async function testerPush(): Promise<ResultatPush> {
  const session = await auth();
  if (!session?.user || session.user.impersonation) return { succes: false };
  const n = await envoyerPush([session.user.id], {
    titre: "EMI4M",
    corps: "Les notifications fonctionnent sur cet appareil.",
    url: "/accueil",
  });
  return n > 0 ? { succes: true } : { succes: false, message: "Aucun appareil n'a pu être prévenu." };
}
