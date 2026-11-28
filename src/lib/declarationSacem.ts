// Déclaration SACEM d'une représentation : logique pure (aucun accès base), testée dans
// declarationSacem.test.ts.

// La SACEM attend l'état des recettes et dépenses et le programme dans les 10 jours qui
// suivent la manifestation : la déclaration part le lendemain, ou dès que le programme est
// saisi s'il arrive plus tard (dans ce délai).
export const DELAI_DECLARATION_JOURS = 10;
const JOUR_MS = 86_400_000;

export interface InfosDeclaration {
  entreePayante: boolean;
  tarifs: string | null;
  entrees: number | null;
  jauge: number | null;
  recettesCentimes: number | null;
  recettesAnnexesCentimes: number | null;
  depensesCentimes: number | null;
}

export function infosDeclaration(e: {
  sacemEntreePayante: boolean;
  sacemTarifs: string | null;
  sacemEntrees: number | null;
  sacemJauge: number | null;
  sacemRecettesCentimes: number | null;
  sacemRecettesAnnexesCentimes: number | null;
  sacemDepensesCentimes: number | null;
}): InfosDeclaration {
  return {
    entreePayante: e.sacemEntreePayante,
    tarifs: e.sacemTarifs,
    entrees: e.sacemEntrees,
    jauge: e.sacemJauge,
    recettesCentimes: e.sacemRecettesCentimes,
    recettesAnnexesCentimes: e.sacemRecettesAnnexesCentimes,
    depensesCentimes: e.sacemDepensesCentimes,
  };
}

// Ce qui manque encore pour une déclaration complète (affiché dans le mail et la page).
export function infosManquantes(i: InfosDeclaration): string[] {
  return [
    i.entrees == null && "nombre de spectateurs",
    i.jauge == null && "jauge de la salle",
    i.entreePayante && !i.tarifs && "prix des places",
    i.entreePayante && i.recettesCentimes == null && "recettes de billetterie",
    i.depensesCentimes == null && "budget des dépenses",
  ].filter((x): x is string => !!x);
}

// Les représentations à déclarer ce matin : passées (au plus tard hier), depuis moins de
// 10 jours, pas encore déclarées, avec au moins un passage au programme.
export function representationsADeclarer<E extends { date: Date; sacemEnvoyeeLe: Date | null; nbPassages: number }>(
  evenements: E[],
  aujourdHui: Date // minuit UTC du jour (heure de Paris)
): E[] {
  const debut = aujourdHui.getTime() - DELAI_DECLARATION_JOURS * JOUR_MS;
  return evenements.filter((e) => !e.sacemEnvoyeeLe && e.nbPassages > 0 && e.date.getTime() < aujourdHui.getTime() && e.date.getTime() >= debut);
}

// « 2026-12-12 Concert de Noël - déclaration SACEM.pdf » : la date du concert en tête.
export function nomFichierDeclaration(e: { date: Date; titre: string }): string {
  const titre = e.titre
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return `${e.date.toISOString().slice(0, 10)} ${titre} - déclaration SACEM.pdf`;
}
