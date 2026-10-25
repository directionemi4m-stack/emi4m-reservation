// Récapitulatifs mensuels pour le comptable, par année scolaire (septembre → août) :
// frais de déplacement et activité accessoire. Calculs purs, testés dans fraisRecap.test.ts.

import { dureeEnMinutes } from "@/lib/activiteAccessoire";
import { formaterDuree, heuresDecimales } from "@/lib/agenda";

type Cellule = string | number;

interface Element {
  date: Date;
  supprimeLe: Date | null;
}

export interface TrajetRecap extends Element {
  km: number;
  prix: number;
}

export interface ActiviteRecap extends Element {
  duree: string;
}

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// Année scolaire d'une date : septembre 2026 → 2026 (« 2026-2027 »), mars 2027 → 2026.
function anneeScolaireDebut(date: Date): number {
  return date.getUTCMonth() >= 8 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
}

// Évite les « 43,199999 » des additions de nombres à virgule.
function arrondi(n: number): number {
  return Math.round(n * 100) / 100;
}

// Pour chaque année scolaire concernée : un titre, un en-tête, les 12 mois (même vides,
// pour une grille d'année complète) et le total de l'année, calculé avec la même
// fonction que les mois sur l'ensemble de l'année. Les éléments supprimés ne sont pas
// comptés ; sans aucun élément, on affiche l'année scolaire en cours, à zéro.
function recapMensuel<T extends Element>(
  elements: T[],
  entete: string[],
  cumuler: (selection: T[]) => Cellule[],
  aujourdHui: Date
): Cellule[][] {
  const actifs = elements.filter((e) => !e.supprimeLe);
  const annees = [...new Set(actifs.map((e) => anneeScolaireDebut(e.date)))].sort((a, b) => a - b);
  if (annees.length === 0) annees.push(anneeScolaireDebut(aujourdHui));

  const lignes: Cellule[][] = [];
  for (const debut of annees) {
    if (lignes.length > 0) lignes.push([]);
    lignes.push([`Récapitulatif ${debut}-${debut + 1}`]);
    lignes.push(["Mois", ...entete]);
    for (let i = 0; i < 12; i++) {
      const mois = (8 + i) % 12; // septembre (8) → août (7)
      const annee = mois >= 8 ? debut : debut + 1;
      const duMois = actifs.filter((e) => e.date.getUTCFullYear() === annee && e.date.getUTCMonth() === mois);
      lignes.push([`${MOIS[mois]} ${annee}`, ...cumuler(duMois)]);
    }
    const deLAnnee = actifs.filter((e) => anneeScolaireDebut(e.date) === debut);
    lignes.push([`Total année ${debut}-${debut + 1}`, ...cumuler(deLAnnee)]);
  }
  return lignes;
}

export function recapMensuelFrais(trajets: TrajetRecap[], aujourdHui: Date = new Date()): Cellule[][] {
  return recapMensuel(
    trajets,
    ["Trajets", "Km", "€"],
    (t) => [t.length, arrondi(t.reduce((s, x) => s + x.km, 0)), arrondi(t.reduce((s, x) => s + x.prix, 0))],
    aujourdHui
  );
}

export function recapMensuelActivites(activites: ActiviteRecap[], aujourdHui: Date = new Date()): Cellule[][] {
  return recapMensuel(
    activites,
    ["Activités", "Durée", "Heures (décimal)"],
    (a) => {
      const minutes = a.reduce((s, x) => s + dureeEnMinutes(x.duree), 0);
      return [a.length, minutes === 0 ? "0 h" : formaterDuree(minutes), Number(heuresDecimales(minutes).replace(",", "."))];
    },
    aujourdHui
  );
}
