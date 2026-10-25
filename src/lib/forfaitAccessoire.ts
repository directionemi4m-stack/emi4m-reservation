// Forfait annuel d'activité accessoire : chaque salarié doit à l'école, par année
// scolaire, son volume horaire hebdomadaire × 6 en réunions, concerts, heures
// musicales… Au-delà, le dépassement lui est payé en fin d'année. Certaines heures
// sont toujours payées sans entamer le forfait (remplacement d'un collègue, financement
// exceptionnel). Calcul pur, testé dans forfaitAccessoire.test.ts.

import { dureeEnMinutes } from "@/lib/activiteAccessoire";

export const SEMAINES_FORFAIT = 6;

export interface ActiviteForfait {
  duree: string;
  supprimeLe: Date | null;
  horsForfait: boolean; // type « toujours payé » ou financement exceptionnel
}

export interface BilanForfait {
  minutesHebdo: number | null; // null : pas encore saisi par la direction
  forfaitMinutes: number | null;
  auForfaitMinutes: number;
  horsForfaitMinutes: number;
  resteMinutes: number | null;
  depassementMinutes: number | null;
  // Hors forfait + dépassement ; null tant que le forfait est inconnu (le dépassement
  // ne peut pas être calculé), même si des heures hors forfait sont déjà dues.
  totalAPayerMinutes: number | null;
}

export function bilanForfait(activites: ActiviteForfait[], minutesHebdo: number | null): BilanForfait {
  const actives = activites.filter((a) => !a.supprimeLe);
  const somme = (liste: ActiviteForfait[]) => liste.reduce((s, a) => s + dureeEnMinutes(a.duree), 0);
  const auForfaitMinutes = somme(actives.filter((a) => !a.horsForfait));
  const horsForfaitMinutes = somme(actives.filter((a) => a.horsForfait));

  if (minutesHebdo === null) {
    return {
      minutesHebdo,
      forfaitMinutes: null,
      auForfaitMinutes,
      horsForfaitMinutes,
      resteMinutes: null,
      depassementMinutes: null,
      totalAPayerMinutes: null,
    };
  }
  const forfaitMinutes = minutesHebdo * SEMAINES_FORFAIT;
  const depassementMinutes = Math.max(0, auForfaitMinutes - forfaitMinutes);
  return {
    minutesHebdo,
    forfaitMinutes,
    auForfaitMinutes,
    horsForfaitMinutes,
    resteMinutes: Math.max(0, forfaitMinutes - auForfaitMinutes),
    depassementMinutes,
    totalAPayerMinutes: horsForfaitMinutes + depassementMinutes,
  };
}

// « 5 », « 5,5 », « 5.5 », « 5h30 », « 5 h 30 » → minutes ; null si illisible.
export function lireHeuresHebdo(texte: string): number | null {
  const t = texte.trim().toLowerCase().replace(/\s+/g, "");
  if (!t) return null;
  const hm = /^(\d{1,2})h(\d{1,2})?$/.exec(t);
  if (hm) {
    const minutes = Number(hm[2] ?? 0);
    return minutes < 60 ? Number(hm[1]) * 60 + minutes : null;
  }
  const decimal = /^\d{1,2}([.,]\d{1,2})?$/.test(t) ? Number(t.replace(",", ".")) : NaN;
  return Number.isFinite(decimal) ? Math.round(decimal * 60) : null;
}
