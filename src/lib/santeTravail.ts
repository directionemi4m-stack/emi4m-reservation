// Suivi de santé au travail des salariés : catégories de suivi, types de visites, calcul de
// la prochaine échéance et contrôle des factures du service de santé au travail.
// Module pur (sans base de données), utilisable côté client comme serveur.
//
// L'employeur ne garde aucune information médicale : seulement les dates, le type de visite,
// l'avis remis (attestation de suivi, apte, inapte…) et la date limite de la prochaine visite.

export type CategorieSuivi = "SIG" | "SIA" | "SIR";
export type TypeVisite = "EMBAUCHE" | "PERIODIQUE" | "INTERMEDIAIRE" | "REPRISE" | "PRE_REPRISE" | "MI_CARRIERE" | "DEMANDE";
export type StatutVisite = "DEMANDEE" | "PREVUE" | "REALISEE" | "ANNULEE";
export type AvisVisite = "ATTESTATION" | "APTE" | "APTE_AMENAGEMENT" | "INAPTE";

export const CATEGORIES: CategorieSuivi[] = ["SIG", "SIA", "SIR"];
export const TYPES_VISITE: TypeVisite[] = ["EMBAUCHE", "PERIODIQUE", "INTERMEDIAIRE", "REPRISE", "PRE_REPRISE", "MI_CARRIERE", "DEMANDE"];
export const STATUTS_VISITE: StatutVisite[] = ["DEMANDEE", "PREVUE", "REALISEE", "ANNULEE"];
export const AVIS: AvisVisite[] = ["ATTESTATION", "APTE", "APTE_AMENAGEMENT", "INAPTE"];

export const LIBELLE_CATEGORIE: Record<CategorieSuivi, string> = {
  SIG: "Suivi général",
  SIA: "Suivi adapté",
  SIR: "Suivi renforcé",
};

export const DETAIL_CATEGORIE: Record<CategorieSuivi, string> = {
  SIG: "Le cas habituel : visite d'information et de prévention dans les 3 mois après l'embauche, puis au plus tous les 5 ans.",
  SIA: "Travailleur handicapé ou invalide, travail de nuit, moins de 18 ans : visite avant la prise de poste, puis au plus tous les 3 ans.",
  SIR: "Poste à risques particuliers : examen d'aptitude avant l'embauche, puis une visite au moins tous les 2 ans (médecin et infirmier en alternance).",
};

// Délai maximal entre deux visites de suivi, en mois.
export const MOIS_ENTRE_VISITES: Record<CategorieSuivi, number> = { SIG: 60, SIA: 36, SIR: 24 };

export const LIBELLE_TYPE_VISITE: Record<TypeVisite, string> = {
  EMBAUCHE: "Visite d'embauche",
  PERIODIQUE: "Visite périodique",
  INTERMEDIAIRE: "Visite intermédiaire",
  REPRISE: "Visite de reprise",
  PRE_REPRISE: "Visite de pré-reprise",
  MI_CARRIERE: "Visite de mi-carrière",
  DEMANDE: "Visite à la demande",
};

export const LIBELLE_STATUT_VISITE: Record<StatutVisite, string> = {
  DEMANDEE: "Demandée au service",
  PREVUE: "Convocation reçue",
  REALISEE: "Réalisée",
  ANNULEE: "Annulée",
};

export const LIBELLE_AVIS: Record<AvisVisite, string> = {
  ATTESTATION: "Attestation de suivi",
  APTE: "Apte",
  APTE_AMENAGEMENT: "Apte avec aménagements",
  INAPTE: "Inapte",
};

// Les visites qui font repartir le délai de suivi.
const VISITES_DE_SUIVI: TypeVisite[] = ["EMBAUCHE", "PERIODIQUE", "INTERMEDIAIRE"];

// Visite de mi-carrière : l'année des 45 ans (règle en vigueur depuis le 31 mars 2022).
export const AGE_MI_CARRIERE = 45;

export interface VisiteSuivi {
  type: TypeVisite;
  statut: StatutVisite;
  date: Date | null;
  prochaineAvant: Date | null;
}

export interface SalarieSuivi {
  categorie: CategorieSuivi;
  embaucheLe: Date | null;
  sortieLe: Date | null;
  affilieLe: Date | null;
  desaffilieLe: Date | null;
  anneeNaissance: number | null;
  visites: VisiteSuivi[];
}

export type EtatSuivi = "SORTI" | "A_CONFIRMER" | "PROGRAMMEE" | "A_RENSEIGNER" | "EN_RETARD" | "BIENTOT" | "A_JOUR";

export const LIBELLE_ETAT: Record<EtatSuivi, string> = {
  SORTI: "Parti",
  A_CONFIRMER: "À confirmer",
  PROGRAMMEE: "Programmée",
  A_RENSEIGNER: "À renseigner",
  EN_RETARD: "En retard",
  BIENTOT: "Bientôt",
  A_JOUR: "À jour",
};

export interface Suivi {
  etat: EtatSuivi;
  echeance: Date | null; // date limite de la prochaine visite de suivi
  phrase: string; // explication courte, affichée sous le nom
  prochaine: VisiteSuivi | null; // visite demandée ou convoquée, la plus proche
  derniere: VisiteSuivi | null; // dernière visite réalisée
  alertes: Alerte[]; // déclaration au service, mi-carrière…
}

export type CleAlerte = "NON_DECLARE" | "PARTI_DECLARE" | "MI_CARRIERE";
export interface Alerte {
  cle: CleAlerte;
  texte: string;
}

// Délai avant l'échéance à partir duquel la visite est signalée « bientôt ».
export const JOURS_AVANT_ALERTE = 90;

export function ajouterMois(d: Date, mois: number): Date {
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + mois, d.getUTCDate()));
  // 31 août + 6 mois → fin février, pas début mars.
  if (r.getUTCDate() !== d.getUTCDate()) return new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth(), 0));
  return r;
}

export const dateCourte = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const dateLongue = (d: Date) => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// Le délai de suivi, à partir de la dernière visite réalisée : la date « prochaine visite au
// plus tard le » notée sur l'attestation quand elle est connue, sinon la règle de la
// catégorie. Sans aucune visite : d'après la date d'embauche.
export function echeanceSuivi(s: SalarieSuivi): Date | null {
  const realisees = s.visites
    .filter((v) => v.statut === "REALISEE" && v.date && (v.prochaineAvant || VISITES_DE_SUIVI.includes(v.type)))
    .sort((a, b) => b.date!.getTime() - a.date!.getTime());
  const derniere = realisees[0];
  if (derniere) return derniere.prochaineAvant ?? ajouterMois(derniere.date!, MOIS_ENTRE_VISITES[s.categorie]);
  if (!s.embaucheLe) return null;
  return s.categorie === "SIG" ? ajouterMois(s.embaucheLe, 3) : s.embaucheLe;
}

export function calculerSuivi(s: SalarieSuivi, aujourdHui: Date): Suivi {
  const realisees = s.visites.filter((v) => v.statut === "REALISEE" && v.date).sort((a, b) => b.date!.getTime() - a.date!.getTime());
  const derniere = realisees[0] ?? null;
  const aVenir = s.visites
    .filter((v) => v.statut === "DEMANDEE" || v.statut === "PREVUE")
    .sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));
  const prochaine = aVenir[0] ?? null;
  const echeance = echeanceSuivi(s);
  const parti = !!s.sortieLe && s.sortieLe.getTime() <= aujourdHui.getTime();

  const alertes: Alerte[] = [];
  if (parti) {
    if (s.affilieLe && !s.desaffilieLe) {
      alertes.push({ cle: "PARTI_DECLARE", texte: "Parti mais toujours déclaré au service : signalez son départ pour ne plus être facturé." });
    }
  } else {
    if (!s.affilieLe) alertes.push({ cle: "NON_DECLARE", texte: "Pas encore déclaré au service de santé au travail." });
    const annee45 = s.anneeNaissance ? s.anneeNaissance + AGE_MI_CARRIERE : null;
    const miCarriereFaite = s.visites.some((v) => v.type === "MI_CARRIERE" && v.statut !== "ANNULEE");
    if (annee45 && annee45 >= 2022 && annee45 <= aujourdHui.getUTCFullYear() && !miCarriereFaite) {
      alertes.push({ cle: "MI_CARRIERE", texte: `Visite de mi-carrière à prévoir (45 ans en ${annee45}).` });
    }
  }

  const base = { echeance, prochaine, derniere, alertes };
  if (parti) return { ...base, etat: "SORTI", phrase: `Parti le ${dateCourte(s.sortieLe!)}` };

  const convocationPassee = aVenir.find((v) => v.statut === "PREVUE" && v.date && v.date.getTime() < aujourdHui.getTime());
  if (convocationPassee) {
    return { ...base, etat: "A_CONFIRMER", phrase: `Convoqué le ${dateCourte(convocationPassee.date!)} : la visite a-t-elle eu lieu ?` };
  }
  if (prochaine) {
    const libelle = LIBELLE_TYPE_VISITE[prochaine.type].toLowerCase();
    return {
      ...base,
      etat: "PROGRAMMEE",
      phrase: prochaine.statut === "PREVUE" && prochaine.date ? `${capitaliser(libelle)} le ${dateCourte(prochaine.date)}` : `${capitaliser(libelle)} demandée, date à venir`,
    };
  }
  if (!echeance) return { ...base, etat: "A_RENSEIGNER", phrase: "Indiquez la date d'embauche ou la dernière visite." };

  const jours = Math.round((echeance.getTime() - aujourdHui.getTime()) / 86400000);
  const quoi = derniere ? "Prochaine visite" : "Première visite";
  if (jours < 0) {
    return { ...base, etat: "EN_RETARD", phrase: derniere ? `${quoi} à faire depuis le ${dateCourte(echeance)}` : `Aucune visite enregistrée (à faire avant le ${dateCourte(echeance)})` };
  }
  if (jours <= JOURS_AVANT_ALERTE) return { ...base, etat: "BIENTOT", phrase: `${quoi} avant le ${dateCourte(echeance)}` };
  return { ...base, etat: "A_JOUR", phrase: `${quoi} avant le ${dateCourte(echeance)}` };
}

const capitaliser = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

// Salarié déclaré au service pendant au moins une partie de l'année civile.
export function affilieEnAnnee(s: { affilieLe: Date | null; desaffilieLe: Date | null }, annee: number): boolean {
  if (!s.affilieLe || s.affilieLe.getUTCFullYear() > annee) return false;
  return !s.desaffilieLe || s.desaffilieLe.getUTCFullYear() >= annee;
}

// Comparaison entre le nombre de salariés facturés et ceux déclarés dans l'appli.
export function controleFacture(nombreFacture: number | null, affilies: number): { ok: boolean; texte: string } | null {
  if (nombreFacture === null) return null;
  if (nombreFacture === affilies) return { ok: true, texte: `${nombreFacture} salarié${nombreFacture > 1 ? "s" : ""} facturé${nombreFacture > 1 ? "s" : ""}, comme dans l'appli` };
  return {
    ok: false,
    texte: `${nombreFacture} salarié${nombreFacture > 1 ? "s" : ""} facturé${nombreFacture > 1 ? "s" : ""}, mais ${affilies} déclaré${affilies > 1 ? "s" : ""} dans l'appli cette année`,
  };
}

// Ordre d'affichage : ce qui demande une action d'abord.
export const ORDRE_ETAT: Record<EtatSuivi, number> = { EN_RETARD: 0, A_CONFIRMER: 1, A_RENSEIGNER: 2, BIENTOT: 3, PROGRAMMEE: 4, A_JOUR: 5, SORTI: 6 };

// Couleur de la pastille d'état (classes Tailwind).
export const COULEUR_ETAT: Record<EtatSuivi, string> = {
  EN_RETARD: "bg-status-occupee/15 text-red-800",
  A_CONFIRMER: "bg-status-attente/15 text-amber-800",
  A_RENSEIGNER: "bg-status-attente/15 text-amber-800",
  BIENTOT: "bg-status-attente/15 text-amber-800",
  PROGRAMMEE: "bg-sky-100 text-sky-800",
  A_JOUR: "bg-status-dispo/15 text-emerald-800",
  SORTI: "bg-slate-100 text-slate-500",
};

// Liste « À faire » de la page Santé : un sujet par ligne, avec les salariés concernés.
export const SUJETS_A_FAIRE: { cle: EtatSuivi | CleAlerte; titre: string }[] = [
  { cle: "EN_RETARD", titre: "Visite en retard" },
  { cle: "A_CONFIRMER", titre: "Convocation passée : la visite a-t-elle eu lieu ?" },
  { cle: "PARTI_DECLARE", titre: "Partis mais toujours déclarés au service (signalez le départ pour ne plus être facturé)" },
  { cle: "A_RENSEIGNER", titre: "Date d'embauche ou dernière visite à indiquer" },
  { cle: "NON_DECLARE", titre: "Pas encore déclarés au service (indiquez la date de déclaration)" },
  { cle: "MI_CARRIERE", titre: "Visite de mi-carrière à prévoir (année des 45 ans)" },
  { cle: "BIENTOT", titre: `Visite à prévoir dans les ${JOURS_AVANT_ALERTE} jours` },
];

export function sujetsDe(suivi: Suivi): (EtatSuivi | CleAlerte)[] {
  return [suivi.etat, ...suivi.alertes.map((a) => a.cle)];
}
