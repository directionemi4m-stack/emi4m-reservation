import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Codes d'alarme personnels (bâtiment de Lans-en-Vercors) : chiffrés en AES-256-GCM avant
// d'être stockés, pour qu'un accès à la base (sauvegarde, export, fuite) ne révèle aucun
// code. Format stocké : « iv.tag.chiffré », chaque partie en base64.
// La clé (CLE_CHIFFREMENT_CODES, 32 octets en base64) ne doit jamais être perdue : sans
// elle, les codes déjà enregistrés deviennent illisibles et seraient à ressaisir.

function cle(): Buffer {
  const brute = process.env.CLE_CHIFFREMENT_CODES;
  if (!brute) throw new Error("CLE_CHIFFREMENT_CODES n'est pas configurée.");
  const octets = Buffer.from(brute, "base64");
  if (octets.length !== 32) throw new Error("CLE_CHIFFREMENT_CODES doit faire 32 octets (base64).");
  return octets;
}

export function chiffrerCode(code: string): string {
  const iv = randomBytes(12);
  const chiffreur = createCipheriv("aes-256-gcm", cle(), iv);
  const chiffre = Buffer.concat([chiffreur.update(code, "utf8"), chiffreur.final()]);
  const tag = chiffreur.getAuthTag();
  return [iv, tag, chiffre].map((b) => b.toString("base64")).join(".");
}

export function dechiffrerCode(stocke: string): string {
  const [iv, tag, chiffre] = stocke.split(".").map((p) => Buffer.from(p, "base64"));
  const dechiffreur = createDecipheriv("aes-256-gcm", cle(), iv);
  dechiffreur.setAuthTag(tag);
  return Buffer.concat([dechiffreur.update(chiffre), dechiffreur.final()]).toString("utf8");
}

// Un code d'alarme : chiffres/lettres et éventuellement * ou #, sans espace.
export function codeValide(code: string): boolean {
  return /^[0-9A-Za-z*#]{2,20}$/.test(code);
}
