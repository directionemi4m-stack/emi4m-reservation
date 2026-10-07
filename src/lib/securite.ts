import { db } from "@/lib/db";
import type { ConsignesContenu } from "@/lib/consignesSecurite";
import { CONSIGNES_VILLARD_DEFAUT, SITE_VILLARD } from "@/lib/consignesSecurite";

// Consignes enregistrées par la direction, ou celles de l'affiche d'origine tant que
// personne ne les a modifiées.
export async function lireConsignes(site: string = SITE_VILLARD): Promise<ConsignesContenu> {
  const ligne = await db.consignesSecurite.findUnique({ where: { site } });
  return (ligne?.contenu as ConsignesContenu | undefined) ?? CONSIGNES_VILLARD_DEFAUT;
}
