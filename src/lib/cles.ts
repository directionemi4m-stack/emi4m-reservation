// Clés et badges : logique pure (aucun accès base), testée dans cles.test.ts.

// Les trois accès du registre papier, dans le même ordre.
export const ACCES = [
  { champ: "clesAutransMeaudre", court: "Clés A/M", long: "Clés Autrans/Méaudre", detail: "clés des locaux", un: "clé A/M", plusieurs: "clés A/M" },
  { champ: "badgeLans", court: "Badge Lans", long: "Badge Lans", detail: "le Cairn", un: "badge Lans", plusieurs: "badges Lans" },
  { champ: "clesVillard", court: "Clés Villard", long: "Clés Villard", detail: "salle Lodéon", un: "clé Villard", plusieurs: "clés Villard" },
] as const;

export type ChampAcces = (typeof ACCES)[number]["champ"];
export type Quantites = Record<ChampAcces, number>;

// « 2 clés A/M · 1 badge Lans » ; chaîne vide si rien.
export function resumeAcces(q: Quantites): string {
  return ACCES.filter((a) => q[a.champ] > 0)
    .map((a) => `${q[a.champ]} ${q[a.champ] > 1 ? a.plusieurs : a.un}`)
    .join(" · ");
}

export function totalAcces(q: Quantites): number {
  return ACCES.reduce((s, a) => s + q[a.champ], 0);
}

// Ce qu'un salarié a encore entre les mains : la somme de ses remises non restituées.
export function enCirculation(remises: (Quantites & { restitueLe: Date | null })[]): Quantites {
  const total: Quantites = { clesAutransMeaudre: 0, badgeLans: 0, clesVillard: 0 };
  for (const r of remises) {
    if (r.restitueLe) continue;
    for (const a of ACCES) total[a.champ] += r[a.champ];
  }
  return total;
}
