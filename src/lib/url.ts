import { headers } from "next/headers";

// Adresse de l'appli pour les liens envoyés par mail (mot de passe, documents à signer…).
// En production, l'adresse officielle fixée par Vercel : un lien de réinitialisation ne
// doit jamais dépendre de l'en-tête « Host » de la requête, qu'un tiers pourrait forger.
export async function urlBase() {
  const production = process.env.VERCEL_ENV === "production" ? process.env.VERCEL_PROJECT_PRODUCTION_URL : undefined;
  if (production) return `https://${production}`;

  const enTetes = await headers();
  const hote = enTetes.get("host");
  const protocole = hote?.startsWith("localhost") ? "http" : "https";
  return `${protocole}://${hote}`;
}
