// Agenda à la carte des ensembles (chorale, orchestres…) : le prof coche ses dates sur un
// calendrier de l'année au lieu d'avoir une séance chaque semaine. Module pur, utilisable
// côté navigateur, testé dans agendaEnsemble.test.ts.

export const MOTS_ENSEMBLE = ["chorale", "ensemble", "orchestre", "atelier"];

// Une discipline d'ensemble : la case « agenda à la carte » est proposée cochée.
export function estDisciplineEnsemble(nom: string): boolean {
  const n = nom.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return MOTS_ENSEMBLE.some((m) => n.includes(m));
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
export const versDate = (j: string) => new Date(`${j}T00:00:00.000Z`);

// Les mois de la saison, de septembre à juin.
export function moisDeLaSaison(saison: number): { annee: number; mois: number }[] {
  return Array.from({ length: 10 }, (_, i) => {
    const mois = (8 + i) % 12;
    return { annee: mois >= 8 ? saison : saison + 1, mois };
  });
}

// Les jours d'un mois en grille lundi → dimanche (null : case vide en début de mois).
export function grilleDuMois(annee: number, mois: number): (string | null)[] {
  const premier = new Date(Date.UTC(annee, mois, 1));
  const decalage = (premier.getUTCDay() + 6) % 7;
  const nbJours = new Date(Date.UTC(annee, mois + 1, 0)).getUTCDate();
  return [
    ...Array<null>(decalage).fill(null),
    ...Array.from({ length: nbJours }, (_, i) => iso(new Date(Date.UTC(annee, mois, i + 1)))),
  ];
}

export interface Periode {
  debut: string; // incluse
  fin: string; // exclue (comme PeriodeVacances)
}

export const pendantLesVacances = (jour: string, vacances: Periode[]) => vacances.some((v) => jour >= v.debut && jour < v.fin);

// Remplissage rapide : tel jour de la semaine (0 = lundi), chaque semaine ou une sur deux,
// entre deux dates incluses, hors vacances et jours fériés.
export function datesRecurrentes(params: {
  jourSemaine: number;
  du: string;
  au: string;
  pas: 1 | 2;
  vacances: Periode[];
  feries: string[];
}): string[] {
  const { jourSemaine, du, au, pas, vacances, feries } = params;
  const d = versDate(du);
  d.setUTCDate(d.getUTCDate() + ((jourSemaine - ((d.getUTCDay() + 6) % 7) + 7) % 7));
  const dates: string[] = [];
  let semaine = 0;
  for (; iso(d) <= au; d.setUTCDate(d.getUTCDate() + 7)) {
    const j = iso(d);
    // Une semaine sur deux se compte sur les semaines de cours (les vacances ne décalent pas le rythme).
    if (pendantLesVacances(j, vacances)) continue;
    if (semaine++ % pas !== 0) continue;
    if (!feries.includes(j)) dates.push(j);
  }
  return dates;
}

// Ce qu'il faut ajouter et retirer pour passer des séances existantes aux dates cochées.
// Une séance verrouillée (appel fait, absence du prof) n'est jamais retirée.
export function differenceAgenda(
  existantes: { id: string; date: string; verrouillee: boolean }[],
  cochees: string[]
): { ajouts: string[]; retraits: string[] } {
  const voulues = new Set(cochees);
  const presentes = new Set(existantes.map((s) => s.date));
  return {
    ajouts: [...voulues].filter((d) => !presentes.has(d)).sort(),
    retraits: existantes.filter((s) => !voulues.has(s.date) && !s.verrouillee).map((s) => s.id),
  };
}
