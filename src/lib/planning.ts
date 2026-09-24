import { db } from "@/lib/db";

// Toutes les dates du planning sont manipulées en UTC (dates « pures » à minuit UTC,
// heures stockées sur le 1er janvier 1970) — comme le reste de l'appli.

const JOUR_ENUM_PAR_INDEX = [
  "DIMANCHE",
  "LUNDI",
  "MARDI",
  "MERCREDI",
  "JEUDI",
  "VENDREDI",
  "SAMEDI",
] as const;

export const LIBELLE_JOUR_COURT: Record<string, string> = {
  LUNDI: "Lun",
  MARDI: "Mar",
  MERCREDI: "Mer",
  JEUDI: "Jeu",
  VENDREDI: "Ven",
  SAMEDI: "Sam",
  DIMANCHE: "Dim",
};

export function jourEnum(date: Date) {
  return JOUR_ENUM_PAR_INDEX[date.getUTCDay()];
}

export function lundiDe(date: Date): Date {
  const decalage = (date.getUTCDay() + 6) % 7; // jours écoulés depuis lundi
  const lundi = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  lundi.setUTCDate(lundi.getUTCDate() - decalage);
  return lundi;
}

export function ajouterJours(date: Date, n: number): Date {
  const resultat = new Date(date);
  resultat.setUTCDate(resultat.getUTCDate() + n);
  return resultat;
}

export function versParamDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// « YYYY-MM-DD » strict → date à minuit UTC, ou null si le texte n'est pas une vraie date.
export function lireParamDate(texte: string | undefined): Date | null {
  if (!texte || !/^\d{4}-\d{2}-\d{2}$/.test(texte)) return null;
  const date = new Date(`${texte}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || versParamDate(date) !== texte ? null : date;
}

export function heureDecimale(date: Date) {
  return date.getUTCHours() + date.getUTCMinutes() / 60;
}

export function formatterHeure(date: Date) {
  return date.toISOString().slice(11, 16);
}

export type TypeOccupation = "recurrent" | "reservation";

// Un « bloc » = une occupation concrète d'une salle un jour donné.
export interface BlocOccupation {
  id: string;
  type: TypeOccupation;
  salleId: string;
  jour: string; // YYYY-MM-DD
  heureDebut: Date;
  heureFin: Date;
  personne: string; // « Prénom Nom » de l'enseignant qui occupe la salle
}

// Charge tout ce qui occupe les salles entre deux dates (incluses) : cours récurrents
// déployés jour par jour + réservations validées.
export async function chargerOccupation(
  salleIds: string[],
  debut: Date,
  fin: Date
): Promise<BlocOccupation[]> {
  if (salleIds.length === 0) return [];

  const [recurrents, reservations] = await Promise.all([
    db.creneauRecurrent.findMany({
      where: {
        salleId: { in: salleIds },
        actif: true,
        dateDebut: { lte: fin },
        OR: [{ dateFin: null }, { dateFin: { gte: debut } }],
      },
      include: { prof: true },
    }),
    db.demandeCreneau.findMany({
      where: { salleId: { in: salleIds }, statut: "VALIDEE", date: { gte: debut, lte: fin } },
      include: { demande: { include: { prof: true } } },
    }),
  ]);

  const blocs: BlocOccupation[] = [];

  for (let jour = new Date(debut); jour <= fin; jour = ajouterJours(jour, 1)) {
    const nomJour = jourEnum(jour);
    for (const c of recurrents) {
      if (c.jourSemaine === nomJour && c.dateDebut <= jour && (!c.dateFin || c.dateFin >= jour)) {
        blocs.push({
          id: c.id,
          type: "recurrent",
          salleId: c.salleId,
          jour: versParamDate(jour),
          heureDebut: c.heureDebut,
          heureFin: c.heureFin,
          personne: `${c.prof.prenom} ${c.prof.nom}`,
        });
      }
    }
  }

  for (const r of reservations) {
    blocs.push({
      id: r.id,
      type: "reservation",
      salleId: r.salleId,
      jour: versParamDate(r.date),
      heureDebut: r.heureDebut,
      heureFin: r.heureFin,
      personne: `${r.demande.prof.prenom} ${r.demande.prof.nom}`,
    });
  }

  return blocs.sort((a, b) => a.heureDebut.getTime() - b.heureDebut.getTime());
}

// Plage horaire affichée : 8h–20h par défaut, élargie si une occupation déborde.
export function axeHoraire(blocs: BlocOccupation[]) {
  let min = 8;
  let max = 20;
  for (const b of blocs) {
    min = Math.min(min, Math.floor(heureDecimale(b.heureDebut)));
    max = Math.max(max, Math.ceil(heureDecimale(b.heureFin)));
  }
  return { min, max };
}

// Deux blocs qui se chevauchent (données anciennes ou incohérentes) sont placés côte à
// côte plutôt que l'un par-dessus l'autre : on ne cache jamais une occupation.
export function disposerBlocs<T extends { heureDebut: Date; heureFin: Date }>(blocs: T[]) {
  const tries = [...blocs].sort((a, b) => a.heureDebut.getTime() - b.heureDebut.getTime());
  const resultat: Array<T & { colonne: number; nbColonnes: number }> = [];

  let groupe: Array<T & { colonne: number; nbColonnes: number }> = [];
  let finGroupe = 0;
  const fermerGroupe = () => {
    const nb = Math.max(1, ...groupe.map((b) => b.colonne + 1));
    for (const b of groupe) b.nbColonnes = nb;
    resultat.push(...groupe);
    groupe = [];
  };

  for (const bloc of tries) {
    const debut = bloc.heureDebut.getTime();
    if (groupe.length > 0 && debut >= finGroupe) fermerGroupe();

    let colonne = 0;
    while (groupe.some((g) => g.colonne === colonne && g.heureFin.getTime() > debut)) colonne++;

    groupe.push({ ...bloc, colonne, nbColonnes: 1 });
    finGroupe = Math.max(finGroupe, bloc.heureFin.getTime());
  }
  if (groupe.length > 0) fermerGroupe();

  return resultat;
}

// Plages libres d'une journée, dans la plage horaire affichée (« 08:00–14:00 », …).
export function plagesLibres(blocs: BlocOccupation[], min: number, max: number) {
  const occupes = blocs
    .map((b) => [heureDecimale(b.heureDebut), heureDecimale(b.heureFin)] as const)
    .sort((a, b) => a[0] - b[0]);

  const libres: Array<[number, number]> = [];
  let curseur = min;
  for (const [debut, fin] of occupes) {
    if (debut > curseur) libres.push([curseur, debut]);
    curseur = Math.max(curseur, fin);
  }
  if (curseur < max) libres.push([curseur, max]);

  const enHHmm = (h: number) => {
    const heures = Math.floor(h);
    const minutes = Math.round((h - heures) * 60);
    return `${String(heures).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };
  return libres.map(([d, f]) => `${enHHmm(d)}–${enHHmm(f)}`);
}
