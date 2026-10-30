// Agenda de la saison et heures musicales : logique pure (aucun accès base), utilisable
// côté client comme côté serveur, testée dans saison.test.ts.

export const TYPES_EVENEMENT_SAISON = [
  { valeur: "HEURE_MUSICALE", label: "Heure musicale" },
  { valeur: "CONCERT", label: "Concert" },
  { valeur: "AUDITION", label: "Audition" },
  { valeur: "EXAMEN", label: "Examen" },
  { valeur: "REUNION", label: "Réunion" },
  { valeur: "AUTRE", label: "Autre" },
] as const;

export function libelleTypeEvenement(type: string): string {
  return TYPES_EVENEMENT_SAISON.find((t) => t.valeur === type)?.label ?? type;
}

// Minutage d'un passage : « 3'30 », « 3:30 », « 3'30'' », « 3 min 30 », « 3 min », « 3 »
// (minutes) → secondes ; null si illisible.
export function lireMinutage(texte: string): number | null {
  const t = texte.trim().toLowerCase().replace(/[’`´]/g, "'").replace(/\s+/g, " ");
  const m = /^(\d{1,3}) ?(?:min|mn|m|'|:)? ?(?:(\d{1,2}) ?(?:s|sec|''|")?)?$/.exec(t);
  if (!m) return null;
  const minutes = Number(m[1]);
  const secondes = Number(m[2] ?? 0);
  if (secondes >= 60) return null;
  const total = minutes * 60 + secondes;
  return total > 0 ? total : null;
}

// 210 → « 3'30 » ; 3750 → « 1 h 02'30 ».
export function formaterMinutage(secondes: number): string {
  const h = Math.floor(secondes / 3600);
  const m = Math.floor((secondes % 3600) / 60);
  const s = secondes % 60;
  const ms = `${h ? String(m).padStart(2, "0") : m}'${String(s).padStart(2, "0")}`;
  return h ? `${h} h ${ms}` : ms;
}

// Minutage à pré-remplir dans un champ : toujours en minutes'secondes (« 62'30 »), pour
// rester relisible par lireMinutage même au-delà d'une heure.
export function minutageEditable(secondes: number): string {
  return `${Math.floor(secondes / 60)}'${String(secondes % 60).padStart(2, "0")}`;
}

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// Les 12 mois de la saison (septembre → août), chacun avec ses événements triés par date
// puis par heure ; les mois sans événement sont gardés, pour une vue d'année complète.
export function grouperParMois<T extends { date: Date; heureDebutMinutes: number | null }>(
  evenements: T[],
  debutSaison: number
): { libelle: string; evenements: T[] }[] {
  return Array.from({ length: 12 }, (_, i) => {
    const mois = (8 + i) % 12;
    const annee = mois >= 8 ? debutSaison : debutSaison + 1;
    return {
      libelle: `${MOIS[mois]} ${annee}`,
      evenements: evenements
        .filter((e) => e.date.getUTCFullYear() === annee && e.date.getUTCMonth() === mois)
        .sort(
          (a, b) =>
            a.date.getTime() - b.date.getTime() || (a.heureDebutMinutes ?? -1) - (b.heureDebutMinutes ?? -1)
        ),
    };
  });
}

// « Villard-de-Lans · Salle Berlioz » ; chaîne vide si rien n'est renseigné.
export function libelleLieu(lieuNom: string | null | undefined, lieuPrecis: string | null | undefined): string {
  return [lieuNom, lieuPrecis].filter(Boolean).join(" · ");
}
