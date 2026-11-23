// Demandes de matériel des profs : niveaux d'urgence, statuts, liens et prix (module pur).

export const URGENCES = ["URGENTE", "HAUTE", "NORMALE", "BASSE"] as const;
export type Urgence = (typeof URGENCES)[number];

export const INFOS_URGENCE: Record<Urgence, { libelle: string; aide: string; classe: string }> = {
  URGENTE: { libelle: "Urgent", aide: "Cours bloqué, matériel hors service", classe: "bg-red-100 text-red-800" },
  HAUTE: { libelle: "Important", aide: "À prévoir dans le mois", classe: "bg-orange-100 text-orange-800" },
  NORMALE: { libelle: "Normal", aide: "Dans les prochains mois", classe: "bg-sky-100 text-sky-800" },
  BASSE: { libelle: "Pas pressé", aide: "Quand le budget le permet", classe: "bg-slate-100 text-slate-600" },
};

export const STATUTS = ["NOUVELLE", "A_L_ETUDE", "VALIDEE", "COMMANDEE", "RECUE", "REFUSEE"] as const;
export type StatutDemande = (typeof STATUTS)[number];

export const INFOS_STATUT: Record<StatutDemande, { libelle: string; classe: string }> = {
  NOUVELLE: { libelle: "Nouvelle", classe: "bg-sky-100 text-sky-800" },
  A_L_ETUDE: { libelle: "À l'étude", classe: "bg-amber-100 text-amber-800" },
  VALIDEE: { libelle: "Validée", classe: "bg-violet-100 text-violet-800" },
  COMMANDEE: { libelle: "Commandée", classe: "bg-indigo-100 text-indigo-800" },
  RECUE: { libelle: "Reçue", classe: "bg-emerald-100 text-emerald-800" },
  REFUSEE: { libelle: "Refusée", classe: "bg-slate-100 text-slate-600" },
};

// Reste à décider ou à acheter.
export const STATUTS_EN_COURS: StatutDemande[] = ["NOUVELLE", "A_L_ETUDE", "VALIDEE"];
// Le prof peut encore corriger sa demande tant que rien n'est décidé.
export const modifiableParProf = (statut: StatutDemande) => statut === "NOUVELLE" || statut === "A_L_ETUDE";

export const TITRE_MAX = 120;
export const DETAILS_MAX = 2000;
export const REPONSE_MAX = 2000;
export const LIBELLE_MAX = 120;
export const URL_MAX = 1000;
export const QUANTITE_MAX = 999;

// Un lien collé par un prof : « thomann.de/fr/x » devient une adresse https complète. Seuls
// http et https sont acceptés (jamais de « javascript: » dans un lien affiché à la direction).
export function lireLien(brut: string): string | null {
  const texte = brut.trim();
  if (!texte || texte.length > URL_MAX || /\s/.test(texte)) return null;
  const aSchema = /^[a-z][a-z0-9+.-]*:/i.test(texte) && !/^[^/:]+:\d+(\/|$)/.test(texte);
  try {
    const url = new URL(aSchema ? texte : `https://${texte}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password || !url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

// « www.thomann.de » → « thomann.de », pour afficher le site sans la longue adresse.
export function nomSite(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export interface PropositionPrix {
  prixCentimes: number | null;
  retenue: boolean;
}

// Coût d'une demande : la proposition retenue, sinon la moins chère (simple estimation).
export function coutDemande(quantite: number, propositions: PropositionPrix[]): { centimes: number; retenue: boolean } | null {
  const retenue = propositions.find((p) => p.retenue && p.prixCentimes !== null);
  if (retenue) return { centimes: retenue.prixCentimes! * quantite, retenue: true };
  const prix = propositions.flatMap((p) => (p.prixCentimes === null ? [] : [p.prixCentimes]));
  return prix.length ? { centimes: Math.min(...prix) * quantite, retenue: false } : null;
}

// Les plus urgentes d'abord, puis les plus anciennes.
export function trierDemandes<T extends { urgence: Urgence; creeLe: Date }>(demandes: T[]): T[] {
  return [...demandes].sort((a, b) => URGENCES.indexOf(a.urgence) - URGENCES.indexOf(b.urgence) || a.creeLe.getTime() - b.creeLe.getTime());
}

// Seule la personne qui a fait la demande la modifie, tant que la direction n'a pas décidé.
// Ni un collègue, ni la direction, ni le mode « connecté en tant que ».
export function peutModifierDemande(moi: { id: string; impersonation?: unknown }, d: { auteurId: string | null; statut: StatutDemande }) {
  return !moi.impersonation && d.auteurId === moi.id && modifiableParProf(d.statut);
}

// En cours d'abord (les plus urgentes en tête), puis commandées, puis reçues et refusées.
export function trierPourTableau<T extends { urgence: Urgence; statut: StatutDemande; creeLe: Date }>(demandes: T[]): T[] {
  const groupe = (s: StatutDemande) => (STATUTS_EN_COURS.includes(s) ? 0 : s === "COMMANDEE" ? 1 : 2);
  return [...trierDemandes(demandes)].sort((a, b) => groupe(a.statut) - groupe(b.statut));
}

// Le contenu de la cellule « Propositions » : une ligne par proposition, avec la position du
// nom du site pour en faire un lien cliquable dans le tableau.
export function cellulePropositions(
  propositions: { libelle: string | null; url: string | null; prixCentimes: number | null; retenue: boolean }[],
  formaterPrix: (centimes: number) => string
): { texte: string; liens: { debut: number; fin: number; url: string }[] } {
  let texte = "";
  const liens: { debut: number; fin: number; url: string }[] = [];
  propositions.forEach((p, i) => {
    if (i > 0) texte += "\n";
    if (p.retenue) texte += "✓ ";
    if (p.url) {
      const site = nomSite(p.url);
      liens.push({ debut: texte.length, fin: texte.length + site.length, url: p.url });
      texte += site;
      if (p.libelle) texte += ` (${p.libelle})`;
    } else {
      texte += p.libelle ?? "Proposition";
    }
    if (p.prixCentimes !== null) texte += ` : ${formaterPrix(p.prixCentimes)}`;
  });
  return { texte, liens };
}
