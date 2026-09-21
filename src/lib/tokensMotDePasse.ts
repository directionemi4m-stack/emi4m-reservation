import { randomBytes, createHash } from "crypto";
import { db } from "@/lib/db";

const UN_JOUR_MS = 24 * 60 * 60 * 1000;
// Réinitialisation demandée par le prof lui-même : courte, par sécurité.
const DUREE_REINITIALISATION_MS = UN_JOUR_MS;
// Invitation envoyée par la direction : le prof n'ouvre pas forcément son mail dans la journée.
export const DUREE_INVITATION_MS = 7 * UN_JOUR_MS;

function hacher(tokenBrut: string) {
  return createHash("sha256").update(tokenBrut).digest("hex");
}

// Le token brut n'existe que dans l'email ; seul son hash est stocké en base.
export async function genererTokenMotDePasse(userId: string, dureeMs = DUREE_REINITIALISATION_MS) {
  const tokenBrut = randomBytes(32).toString("hex");
  await db.tokenMotDePasse.deleteMany({ where: { userId } });
  await db.tokenMotDePasse.create({
    data: { userId, token: hacher(tokenBrut), expire: new Date(Date.now() + dureeMs) },
  });
  return tokenBrut;
}

export async function verifierTokenMotDePasse(tokenBrut: string) {
  const entree = await db.tokenMotDePasse.findUnique({
    where: { token: hacher(tokenBrut) },
    include: { user: true },
  });
  if (!entree || entree.expire < new Date()) return null;
  return entree.user;
}

export async function consommerTokenMotDePasse(tokenBrut: string) {
  await db.tokenMotDePasse.deleteMany({ where: { token: hacher(tokenBrut) } });
}
