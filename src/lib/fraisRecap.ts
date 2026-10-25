// Récapitulatifs mensuels pour le comptable, par année scolaire (septembre → août) :
// frais de déplacement et activité accessoire. Calculs purs, testés dans fraisRecap.test.ts.

import { dureeEnMinutes } from "@/lib/activiteAccessoire";
import { formaterDuree } from "@/lib/agenda";
import { bilanForfait, SEMAINES_FORFAIT } from "@/lib/forfaitAccessoire";

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
  horsForfait: boolean; // type « toujours payé » ou financement exceptionnel
}

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// Année scolaire d'une date : septembre 2026 → 2026 (« 2026-2027 »), mars 2027 → 2026.
export function anneeScolaireDebut(date: Date): number {
  return date.getUTCMonth() >= 8 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
}

export function libelleAnneeScolaire(debut: number): string {
  return `${debut}-${debut + 1}`;
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
  aujourdHui: Date,
  // Lignes ajoutées sous le total de chaque année (ex. bilan du forfait).
  apresTotal?: (debut: number, deLAnnee: T[]) => Cellule[][]
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
    if (apresTotal) lignes.push(...apresTotal(debut, deLAnnee));
  }
  return lignes;
}

// Heures décimales en nombre (3,5 h) : c'est ce dont le comptable a besoin pour la paie.
function heures(minutes: number): number {
  return Math.round((minutes / 60) * 1000) / 1000;
}

export function recapMensuelFrais(trajets: TrajetRecap[], aujourdHui: Date = new Date()): Cellule[][] {
  return recapMensuel(
    trajets,
    ["Trajets", "Km", "€"],
    (t) => [t.length, arrondi(t.reduce((s, x) => s + x.km, 0)), arrondi(t.reduce((s, x) => s + x.prix, 0))],
    aujourdHui
  );
}

// Par mois : heures prises sur le forfait, et heures hors forfait (remplacements,
// financements exceptionnels) à payer dès ce mois-là. Sous le total de l'année, le bilan
// du forfait : le dépassement éventuel est payé en fin d'année.
// minutesHebdoParAnnee : volume hebdo du contrat par année scolaire (« 2026-2027 »).
export function recapMensuelActivites(
  activites: ActiviteRecap[],
  minutesHebdoParAnnee: Record<string, number>,
  aujourdHui: Date = new Date()
): Cellule[][] {
  const minutes = (liste: ActiviteRecap[]) => liste.reduce((s, x) => s + dureeEnMinutes(x.duree), 0);
  return recapMensuel(
    activites,
    ["Activités", "Au forfait (h)", "Hors forfait à payer (h)"],
    (a) => [a.length, heures(minutes(a.filter((x) => !x.horsForfait))), heures(minutes(a.filter((x) => x.horsForfait)))],
    aujourdHui,
    (debut, deLAnnee) => {
      const annee = libelleAnneeScolaire(debut);
      const b = bilanForfait(deLAnnee, minutesHebdoParAnnee[annee] ?? null);
      if (b.minutesHebdo === null || b.forfaitMinutes === null) {
        return [
          [],
          [`Bilan du forfait ${annee}`],
          ["Heures hebdo du contrat", "Non renseignées par la direction"],
          ["Hors forfait à payer (h)", heures(b.horsForfaitMinutes)],
        ];
      }
      return [
        [],
        [`Bilan du forfait ${annee}`],
        ["Heures hebdo du contrat", formaterDuree(b.minutesHebdo)],
        [`Forfait annuel (× ${SEMAINES_FORFAIT}) (h)`, heures(b.forfaitMinutes)],
        ["Heures au forfait effectuées (h)", heures(b.auForfaitMinutes)],
        ["Reste du forfait (h)", heures(b.resteMinutes ?? 0)],
        ["Dépassement à payer en fin d'année (h)", heures(b.depassementMinutes ?? 0)],
        ["Hors forfait à payer (h)", heures(b.horsForfaitMinutes)],
        ["Total à payer sur l'année (h)", heures(b.totalAPayerMinutes ?? 0)],
      ];
    }
  );
}
