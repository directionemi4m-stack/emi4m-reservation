// Récapitulatif mensuel des frais de déplacement d'un prof, par année scolaire
// (septembre → août), pour le comptable. Calcul pur, testé dans fraisRecap.test.ts.

export interface TrajetRecap {
  date: Date;
  km: number;
  prix: number;
  supprimeLe: Date | null;
}

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// Année scolaire d'une date : septembre 2026 → « 2026-2027 », mars 2027 → « 2026-2027 ».
function anneeScolaireDebut(date: Date): number {
  return date.getUTCMonth() >= 8 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
}

// Évite les « 43,199999 » des additions de nombres à virgule.
function arrondi(n: number): number {
  return Math.round(n * 100) / 100;
}

// Lignes prêtes à écrire dans le classeur : pour chaque année scolaire concernée, un
// titre, un en-tête, les 12 mois (même vides, pour une grille d'année complète) et le
// total de l'année. Les trajets supprimés ne sont pas comptés. Sans aucun trajet, on
// affiche l'année scolaire en cours, à zéro.
export function recapMensuelFrais(trajets: TrajetRecap[], aujourdHui: Date = new Date()): (string | number)[][] {
  const actifs = trajets.filter((t) => !t.supprimeLe);
  const annees = [...new Set(actifs.map((t) => anneeScolaireDebut(t.date)))].sort((a, b) => a - b);
  if (annees.length === 0) annees.push(anneeScolaireDebut(aujourdHui));

  const lignes: (string | number)[][] = [];
  for (const debut of annees) {
    if (lignes.length > 0) lignes.push([]);
    lignes.push([`Récapitulatif ${debut}-${debut + 1}`]);
    lignes.push(["Mois", "Trajets", "Km", "€"]);
    let totalTrajets = 0;
    let totalKm = 0;
    let totalPrix = 0;
    for (let i = 0; i < 12; i++) {
      const mois = (8 + i) % 12; // septembre (8) → août (7)
      const annee = mois >= 8 ? debut : debut + 1;
      const duMois = actifs.filter((t) => t.date.getUTCFullYear() === annee && t.date.getUTCMonth() === mois);
      const km = duMois.reduce((s, t) => s + t.km, 0);
      const prix = arrondi(duMois.reduce((s, t) => s + t.prix, 0));
      totalTrajets += duMois.length;
      totalKm += km;
      totalPrix += prix;
      lignes.push([`${MOIS[mois]} ${annee}`, duMois.length, arrondi(km), prix]);
    }
    lignes.push([`Total année ${debut}-${debut + 1}`, totalTrajets, arrondi(totalKm), arrondi(totalPrix)]);
  }
  return lignes;
}
