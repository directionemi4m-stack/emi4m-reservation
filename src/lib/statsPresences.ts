// Statistiques de présence des élèves sur une saison, pour le classeur « Feuilles de
// présence » : élèves à suivre (souvent absents ou excusés), présences par élève, par
// cours et par mois. Module pur, testé dans statsPresences.test.ts.

export type Statut = "PRESENT" | "EXCUSE" | "ABSENT";

export interface MarqueStat {
  personne: string; // même élève dans plusieurs cours = même clé (fiche de l'annuaire)
  nom: string; // nom affiché
  cours: string; // « Violon »
  prof: string;
  date: Date;
  statut: Statut;
}

// Seuils « à suivre » (calés sur la saison 2026-2027 : une vingtaine d'élèves sur 180).
export const SEUIL_ABSENCES = 2; // absences injustifiées
export const SEUIL_EXCUSES = 3; // absences justifiées
export const SEUIL_TAUX = 0.3; // part des séances manquées…
export const SEANCES_MIN_TAUX = 4; // …à partir de 4 séances

interface Compte {
  seances: number;
  present: number;
  excuse: number;
  absent: number;
  dernieresAbsences: { date: Date; statut: Statut }[];
}

// Le détail d'un élève dans un de ses cours (une discipline avec son prof).
export interface StatCours extends Compte {
  cours: string;
  prof: string;
}

export interface StatEleve extends Compte {
  personne: string;
  nom: string;
  cours: string[];
  profs: string[];
  parCours: StatCours[]; // du cours le plus manqué au moins manqué
}

export type Niveau = "Absences injustifiées" | "Souvent absent" | "Souvent excusé";

export const tauxPresence = (s: { present: number; seances: number }) => (s.seances ? s.present / s.seances : 0);

// Pourquoi l'élève est à suivre (le plus grave d'abord), ou null.
export function niveauASuivre(s: StatEleve): Niveau | null {
  if (s.absent >= SEUIL_ABSENCES) return "Absences injustifiées";
  if (s.seances >= SEANCES_MIN_TAUX && (s.excuse + s.absent) / s.seances >= SEUIL_TAUX) return "Souvent absent";
  if (s.excuse >= SEUIL_EXCUSES) return "Souvent excusé";
  return null;
}

const GRAVITE: Record<Niveau, number> = { "Absences injustifiées": 0, "Souvent absent": 1, "Souvent excusé": 2 };
const uniques = (l: string[]) => [...new Set(l)].sort((a, b) => a.localeCompare(b, "fr"));

function compter(ms: MarqueStat[]): Compte {
  return {
    seances: ms.length,
    present: ms.filter((m) => m.statut === "PRESENT").length,
    excuse: ms.filter((m) => m.statut === "EXCUSE").length,
    absent: ms.filter((m) => m.statut === "ABSENT").length,
    dernieresAbsences: ms
      .filter((m) => m.statut !== "PRESENT")
      .map((m) => ({ date: m.date, statut: m.statut }))
      .sort((a, b) => b.date.getTime() - a.date.getTime()),
  };
}

export function statsParEleve(marques: MarqueStat[]): StatEleve[] {
  const parPersonne = new Map<string, MarqueStat[]>();
  for (const m of marques) parPersonne.set(m.personne, [...(parPersonne.get(m.personne) ?? []), m]);
  return [...parPersonne].map(([personne, ms]) => {
    const parCours = new Map<string, MarqueStat[]>();
    for (const m of ms) parCours.set(`${m.cours}|${m.prof}`, [...(parCours.get(`${m.cours}|${m.prof}`) ?? []), m]);
    return {
      personne,
      nom: ms[0].nom,
      cours: uniques(ms.map((m) => m.cours)),
      profs: uniques(ms.map((m) => m.prof)),
      ...compter(ms),
      parCours: [...parCours.values()]
        .map((l) => ({ cours: l[0].cours, prof: l[0].prof, ...compter(l) }))
        .sort((a, b) => b.absent + b.excuse - (a.absent + a.excuse) || a.cours.localeCompare(b.cours, "fr")),
    };
  });
}

// Les élèves à suivre, du plus préoccupant au moins préoccupant.
export function elevesASuivre(stats: StatEleve[]): (StatEleve & { niveau: Niveau })[] {
  return stats
    .flatMap((s) => {
      const niveau = niveauASuivre(s);
      return niveau ? [{ ...s, niveau }] : [];
    })
    .sort(
      (a, b) =>
        GRAVITE[a.niveau] - GRAVITE[b.niveau] ||
        b.absent - a.absent ||
        tauxPresence(a) - tauxPresence(b) ||
        b.excuse - a.excuse ||
        a.nom.localeCompare(b.nom, "fr")
    );
}

export interface Groupe {
  libelle: string;
  seances: number; // marques (élève × séance)
  present: number;
  excuse: number;
  absent: number;
}

function grouper(marques: MarqueStat[], cle: (m: MarqueStat) => string): Groupe[] {
  const g = new Map<string, Groupe>();
  for (const m of marques) {
    const k = cle(m);
    const x = g.get(k) ?? { libelle: k, seances: 0, present: 0, excuse: 0, absent: 0 };
    x.seances++;
    if (m.statut === "PRESENT") x.present++;
    else if (m.statut === "EXCUSE") x.excuse++;
    else x.absent++;
    g.set(k, x);
  }
  return [...g.values()];
}

export const parCours = (marques: MarqueStat[]) =>
  grouper(marques, (m) => `${m.cours} — ${m.prof}`).sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"));

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
export const parMois = (marques: MarqueStat[]) =>
  grouper([...marques].sort((a, b) => a.date.getTime() - b.date.getTime()), (m) => `${MOIS[m.date.getUTCMonth()]} ${m.date.getUTCFullYear()}`);

export const pourcent = (x: number) => `${Math.round(x * 100)} %`;
const dateCourte = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
export const libelleAbsences = (l: { date: Date; statut: Statut }[], max = 6) =>
  l
    .slice(0, max)
    .map((a) => `${dateCourte(a.date)}${a.statut === "EXCUSE" ? " (exc.)" : ""}`)
    .join(", ") + (l.length > max ? "…" : "");

// --- Mise en forme des onglets ---

export interface Onglet {
  lignes: (string | number)[][];
  titres: number[]; // lignes en gros titre
  entetes: number[]; // lignes d'en-tête de tableau (fond ardoise, texte blanc)
  couleurs: { ligne: number; niveau: Niveau }[];
}

// Une ligne par élève et par cours : on voit dans quelle discipline il manque. La dernière
// colonne rappelle son bilan sur tous ses cours quand il en suit plusieurs.
const ENTETE_ELEVE = ["Élève", "Cours", "Prof", "Séances", "Présent", "Excusé", "Absent", "Présence", "Absences dans ce cours", "Tous ses cours"];
const bilanTousCours = (s: StatEleve) =>
  s.parCours.length > 1 ? `${pourcent(tauxPresence(s))} de présence sur ${s.seances} séances (${s.excuse} exc., ${s.absent} abs.)` : "";
const lignesEleve = (s: StatEleve) =>
  s.parCours.map((c) => [
    s.nom,
    c.cours,
    c.prof,
    c.seances,
    c.present,
    c.excuse,
    c.absent,
    pourcent(tauxPresence(c)),
    libelleAbsences(c.dernieresAbsences, 10),
    bilanTousCours(s),
  ]);

export function ongletASuivre(marques: MarqueStat[], saison: string, majLe: string): Onglet {
  const suivre = elevesASuivre(statsParEleve(marques));
  const lignes: (string | number)[][] = [
    [`Élèves à suivre — saison ${saison}`],
    [`Mis à jour le ${majLe}, d'après les feuilles d'appel. Un élève qui suit plusieurs cours est compté une seule fois.`],
    [
      `À suivre : ${SEUIL_ABSENCES} absences injustifiées ou plus (rouge), ${Math.round(SEUIL_TAUX * 100)} % des séances manquées ou plus (orange), ${SEUIL_EXCUSES} absences justifiées ou plus (jaune).`,
    ],
    [],
    ["À suivre", ...ENTETE_ELEVE],
  ];
  const couleurs: Onglet["couleurs"] = [];
  for (const s of suivre) {
    for (const l of lignesEleve(s)) {
      couleurs.push({ ligne: lignes.length, niveau: s.niveau });
      lignes.push([s.niveau, ...l]);
    }
  }
  if (suivre.length === 0) lignes.push(["Aucun élève à suivre pour l'instant."]);
  return { lignes, titres: [0], entetes: [4], couleurs };
}

export function ongletStatistiques(marques: MarqueStat[], saison: string, majLe: string): Onglet {
  const stats = statsParEleve(marques).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  const total = grouper(marques, () => "Total")[0] ?? { libelle: "Total", seances: 0, present: 0, excuse: 0, absent: 0 };
  const ligneGroupe = (g: Groupe) => [g.libelle, g.seances, g.present, g.excuse, g.absent, pourcent(tauxPresence(g))];
  const enteteGroupe = (titre: string) => [titre, "Présences notées", "Présent", "Excusé", "Absent", "Présence"];

  const lignes: (string | number)[][] = [];
  const titres: number[] = [];
  const entetes: number[] = [];
  const couleurs: Onglet["couleurs"] = [];
  const titre = (t: string) => {
    titres.push(lignes.length);
    lignes.push([t]);
  };
  const entete = (l: string[]) => {
    entetes.push(lignes.length);
    lignes.push(l);
  };

  titre(`Statistiques de présence — saison ${saison}`);
  lignes.push([`Mis à jour le ${majLe}, d'après les feuilles d'appel.`], []);
  entete(["Résumé", "Nombre"]);
  lignes.push(
    ["Élèves notés", stats.length],
    ["Présences notées (élève × séance)", total.seances],
    ["Taux de présence", pourcent(tauxPresence(total))],
    ["Absences justifiées", total.excuse],
    ["Absences injustifiées", total.absent],
    ["Élèves à suivre", elevesASuivre(stats).length],
    []
  );
  entete(enteteGroupe("Par mois"));
  lignes.push(...parMois(marques).map(ligneGroupe), []);
  entete(enteteGroupe("Par cours"));
  lignes.push(...parCours(marques).map(ligneGroupe), []);
  titre("Tous les élèves");
  entete(ENTETE_ELEVE);
  for (const s of stats) {
    const niveau = niveauASuivre(s);
    for (const l of lignesEleve(s)) {
      if (niveau) couleurs.push({ ligne: lignes.length, niveau });
      lignes.push(l);
    }
  }
  return { lignes, titres, entetes, couleurs };
}
