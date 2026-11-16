// Devis et factures émis par l'EMI4M : numérotation, totaux, états, lecture des lignes.
// Module pur, utilisable côté navigateur, testé dans devis.test.ts.

export const MENTION_TVA_DEFAUT = "TVA non applicable";
export const CONDITIONS_DEFAUT = "Paiement à 30 jours à réception de la facture, par virement ou par chèque à l'ordre de l'EMI4M.";
export const MENTIONS_FACTURE_DEFAUT =
  "En cas de retard de paiement : pénalités au taux d'intérêt légal et indemnité forfaitaire de 40 € pour frais de recouvrement (art. L441-10 et D441-5 du Code de commerce).";
export const VALIDITE_JOURS = 30;
export const ECHEANCE_JOURS = 30;

export interface Ligne {
  designation: string;
  quantite: number;
  unite: string | null;
  prixUnitaireCentimes: number;
}

// « 1 234,50 € »
export const euros = (centimes: number) =>
  `${(centimes / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export const totalLigne = (l: Pick<Ligne, "quantite" | "prixUnitaireCentimes">) => Math.round(l.quantite * l.prixUnitaireCentimes);
export const totalDocument = (lignes: Pick<Ligne, "quantite" | "prixUnitaireCentimes">[]) => lignes.reduce((s, l) => s + totalLigne(l), 0);

// « 1,5 » ou « 1.5 » → 1.5 ; « 49,80 » → 4980 centimes.
export function lireNombre(texte: string): number | null {
  const t = texte.trim().replace(/\s| /g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}
export function lireCentimes(texte: string): number | null {
  const n = lireNombre(texte.replace(/€/g, ""));
  return n === null ? null : Math.round(n * 100);
}

// D-2026-001, D-2026-002… : le plus grand numéro de l'année + 1.
export function prochainNumero(prefixe: "D" | "F", annee: number, existants: string[]): string {
  const motif = new RegExp(`^${prefixe}-${annee}-(\\d+)$`);
  const max = Math.max(0, ...existants.map((n) => Number(motif.exec(n)?.[1] ?? 0)));
  return `${prefixe}-${annee}-${String(max + 1).padStart(3, "0")}`;
}

export type EtatDevis = "BROUILLON" | "ENVOYE" | "EXPIRE" | "ACCEPTE" | "REFUSE";
export const LIBELLE_ETAT: Record<EtatDevis, string> = {
  BROUILLON: "Brouillon",
  ENVOYE: "Envoyé",
  EXPIRE: "Expiré",
  ACCEPTE: "Accepté",
  REFUSE: "Refusé",
};

// Un devis envoyé dont la validité est passée sans réponse est « expiré ».
export function etatDevis(statut: "BROUILLON" | "ENVOYE" | "ACCEPTE" | "REFUSE", valableJusquAu: Date, aujourdHui: Date): EtatDevis {
  return statut === "ENVOYE" && valableJusquAu.getTime() < aujourdHui.getTime() ? "EXPIRE" : statut;
}

// Envoyé depuis au moins 15 jours sans réponse (et pas encore expiré) : à relancer.
export const JOURS_AVANT_RELANCE = 15;
export const aRelancer = (statut: string, envoyeLe: Date | null, valableJusquAu: Date, aujourdHui: Date) =>
  statut === "ENVOYE" &&
  !!envoyeLe &&
  valableJusquAu.getTime() >= aujourdHui.getTime() &&
  aujourdHui.getTime() - envoyeLe.getTime() >= JOURS_AVANT_RELANCE * 86400000;

export const ajouterJours = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

// Les lignes du formulaire (champs répétés), sans les lignes vides.
export function lireLignes(champs: { designations: string[]; quantites: string[]; unites: string[]; prix: string[] }): { lignes: Ligne[] } | { erreur: string } {
  const lignes: Ligne[] = [];
  for (let i = 0; i < champs.designations.length; i++) {
    const designation = (champs.designations[i] ?? "").trim();
    const q = (champs.quantites[i] ?? "").trim();
    const p = (champs.prix[i] ?? "").trim();
    if (!designation && !q && !p) continue;
    const n = lignes.length + 1;
    if (!designation) return { erreur: `Ligne ${n} : la désignation est requise.` };
    const quantite = q ? lireNombre(q) : 1;
    if (quantite === null || quantite <= 0) return { erreur: `« ${designation} » : quantité invalide (ex. 1 ou 1,5).` };
    const prixUnitaireCentimes = lireCentimes(p || "0");
    if (prixUnitaireCentimes === null || prixUnitaireCentimes < 0) return { erreur: `« ${designation} » : prix invalide (ex. 45 ou 45,50).` };
    lignes.push({ designation: designation.slice(0, 500), quantite, unite: (champs.unites[i] ?? "").trim().slice(0, 30) || null, prixUnitaireCentimes });
  }
  if (lignes.length === 0) return { erreur: "Ajoutez au moins une ligne." };
  return { lignes };
}

// « D-2026-001 Mairie de Lans-en-Vercors.pdf »
export function nomFichierDocument(numero: string, client: string, suffixe = ""): string {
  const propre = client.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  return `${numero} ${propre}${suffixe}.pdf`;
}
