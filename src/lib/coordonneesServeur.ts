import { db } from "@/lib/db";
import { COORDONNEES_DEFAUT, type Coordonnees } from "@/lib/programmes";

// Les coordonnées de l'école enregistrées par la direction, ou celles proposées par défaut.
export async function lireCoordonnees(): Promise<Coordonnees & { enregistrees: boolean }> {
  const c = await db.coordonneesEcole.findUnique({ where: { id: "singleton" } });
  return c ? { ...c, enregistrees: true } : { ...COORDONNEES_DEFAUT, enregistrees: false };
}
