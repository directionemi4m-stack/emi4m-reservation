import { randomBytes, createHash } from "crypto";
import { db } from "@/lib/db";

const DUREE_VALIDITE_MS = 24 * 60 * 60 * 1000;

function hacher(tokenBrut: string) {
  return createHash("sha256").update(tokenBrut).digest("hex");
}

// Le token brut n'existe que dans l'email ; seul son hash est stocké en base.
export async function genererTokenMotDePasse(userId: string) {
  const tokenBrut = randomBytes(32).toString("hex");
  await db.tokenMotDePasse.deleteMany({ where: { userId } });
  await db.tokenMotDePasse.create({
    data: { userId, token: hacher(tokenBrut), expire: new Date(Date.now() + DUREE_VALIDITE_MS) },
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
