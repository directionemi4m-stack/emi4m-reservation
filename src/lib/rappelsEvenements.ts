// Rappels pratiques avant les événements de la saison : logique pure (aucun accès base),
// testée dans rappelsEvenements.test.ts. Le cron quotidien (cf. rappelsEvenementsServeur)
// envoie les notifications.
import { minutesVersHeure } from "@/lib/agenda";
import { libelleLieu } from "@/lib/saison";

export type GenreRappel = "materiel" | "cles";

// Nombre de jours avant l'événement où part chaque rappel.
export const JOURS_AVANT: Record<GenreRappel, number> = { materiel: 2, cles: 1 };

export interface EvenementARappeler {
  id: string;
  titre: string;
  date: Date; // jour de l'événement (minuit UTC, colonne @db.Date)
  heureDebutMinutes: number | null;
  lieuNom: string | null;
  lieuPrecis: string | null;
  rappelMaterielPour: Date | null;
  rappelClesPour: Date | null;
}

const jourIso = (d: Date) => d.toISOString().slice(0, 10);

function decalerJour(jour: string, jours: number) {
  const d = new Date(`${jour}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + jours);
  return jourIso(d);
}

// Les rappels du jour (aujourdHui au format AAAA-MM-JJ, heure de Paris) : matériel pour les
// événements dans 2 jours, clés pour ceux de demain, sauf s'ils sont déjà partis pour
// cette date.
export function rappelsAEnvoyer<T extends EvenementARappeler>(evenements: T[], aujourdHui: string) {
  const rappels: { evenement: T; genre: GenreRappel }[] = [];
  for (const genre of ["materiel", "cles"] as const) {
    const cible = decalerJour(aujourdHui, JOURS_AVANT[genre]);
    for (const e of evenements) {
      const dejaPour = genre === "materiel" ? e.rappelMaterielPour : e.rappelClesPour;
      if (jourIso(e.date) === cible && (!dejaPour || jourIso(dejaPour) !== cible)) rappels.push({ evenement: e, genre });
    }
  }
  return rappels;
}

// « Soirée cordes à 20h00 (Villard-de-Lans · La Verrière) »
function descriptif(e: EvenementARappeler) {
  const lieu = libelleLieu(e.lieuNom, e.lieuPrecis);
  return `${e.titre}${e.heureDebutMinutes != null ? ` à ${minutesVersHeure(e.heureDebutMinutes)}` : ""}${lieu ? ` (${lieu})` : ""}`;
}

export function messageRappel(e: EvenementARappeler, genre: GenreRappel) {
  const url = `/saison/${e.id}`;
  if (genre === "cles") {
    return { titre: "Clés à récupérer", corps: `Demain : ${descriptif(e)}. Pensez à aller chercher les clés.`, url };
  }
  const jour = e.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return { titre: "Matériel à préparer", corps: `Dans 2 jours, ${jour} : ${descriptif(e)}. Préparez le matériel.`, url };
}
