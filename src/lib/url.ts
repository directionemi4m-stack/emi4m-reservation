import { headers } from "next/headers";

export async function urlBase() {
  const enTetes = await headers();
  const hote = enTetes.get("host");
  const protocole = hote?.startsWith("localhost") ? "http" : "https";
  return `${protocole}://${hote}`;
}
