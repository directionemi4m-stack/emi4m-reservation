// Attestations de vente de matériel d'occasion (particulier → EMI4M) : numérotation, lignes,
// montant en lettres. Module pur, utilisable côté navigateur, testé dans attestationAchat.test.ts.
import { lireCentimes } from "@/lib/devis";

export const LIBELLE_PAIEMENT = { VIREMENT: "Virement bancaire", CHEQUE: "Chèque", ESPECES: "Espèces" } as const;
export const LIBELLE_DESTINATION = { ECOLE: "Usage école", LOCATION: "Parc de location aux élèves" } as const;

// ACH-2026-001, ACH-2026-002…
export function prochainNumeroAchat(annee: number, existants: string[]): string {
  const motif = new RegExp(`^ACH-${annee}-(\\d+)$`);
  const max = Math.max(0, ...existants.map((n) => Number(motif.exec(n)?.[1] ?? 0)));
  return `ACH-${annee}-${String(max + 1).padStart(3, "0")}`;
}

export interface LigneAchat {
  designation: string;
  marqueModele: string | null;
  numeroSerie: string | null;
  etat: string | null;
  prixCentimes: number;
}

export function lireLignesAchat(c: { designations: string[]; marques: string[]; series: string[]; etats: string[]; prix: string[] }): { lignes: LigneAchat[] } | { erreur: string } {
  const lignes: LigneAchat[] = [];
  for (let i = 0; i < c.designations.length; i++) {
    const designation = (c.designations[i] ?? "").trim();
    const prix = (c.prix[i] ?? "").trim();
    const reste = [c.marques[i], c.series[i], c.etats[i]].map((x) => (x ?? "").trim());
    if (!designation && !prix && reste.every((x) => !x)) continue;
    if (!designation) return { erreur: `Ligne ${lignes.length + 1} : la désignation est requise.` };
    const prixCentimes = lireCentimes(prix);
    if (prixCentimes === null || prixCentimes < 0) return { erreur: `« ${designation} » : prix invalide (ex. 250 ou 250,50).` };
    lignes.push({
      designation: designation.slice(0, 200),
      marqueModele: reste[0].slice(0, 120) || null,
      numeroSerie: reste[1].slice(0, 80) || null,
      etat: reste[2].slice(0, 80) || null,
      prixCentimes,
    });
  }
  if (lignes.length === 0) return { erreur: "Indiquez au moins un matériel acheté." };
  return { lignes };
}

// --- Montant en lettres ---

const UNITES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
const DIZAINES = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante"];

function moinsDeCent(n: number): string {
  if (n <= 16) return UNITES[n];
  if (n < 20) return `dix-${UNITES[n - 10]}`;
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (d === 7 || d === 9) {
    // 70-79 : soixante-dix… ; 90-99 : quatre-vingt-dix…
    const base = d === 7 ? "soixante" : "quatre-vingt";
    const reste = 10 + u;
    return d === 7 && u === 1 ? "soixante et onze" : `${base}-${moinsDeCent(reste)}`;
  }
  if (d === 8) return u === 0 ? "quatre-vingts" : `quatre-vingt-${UNITES[u]}`;
  if (u === 0) return DIZAINES[d];
  if (u === 1) return `${DIZAINES[d]} et un`;
  return `${DIZAINES[d]}-${UNITES[u]}`;
}

function moinsDeMille(n: number): string {
  const c = Math.floor(n / 100);
  const r = n % 100;
  const centaines = c === 0 ? "" : c === 1 ? "cent" : `${UNITES[c]} cent${r === 0 ? "s" : ""}`;
  if (r === 0) return centaines || "zéro";
  return centaines ? `${centaines} ${moinsDeCent(r)}` : moinsDeCent(r);
}

// 1 250 → « mille deux cent cinquante » ; 80 000 → « quatre-vingt mille ».
export function nombreEnLettres(n: number): string {
  if (n === 0) return "zéro";
  const millions = Math.floor(n / 1_000_000);
  const milliers = Math.floor((n % 1_000_000) / 1000);
  const reste = n % 1000;
  const parts: string[] = [];
  if (millions) parts.push(millions === 1 ? "un million" : `${moinsDeMille(millions)} millions`);
  // « quatre-vingts » et « deux cents » perdent leur « s » devant « mille ».
  if (milliers) parts.push(milliers === 1 ? "mille" : `${moinsDeMille(milliers).replace(/(vingt|cent)s$/, "$1")} mille`);
  if (reste) parts.push(moinsDeMille(reste));
  return parts.join(" ");
}

// 125050 centimes → « mille deux cent cinquante euros et cinquante centimes ».
export function montantEnLettres(centimes: number): string {
  const euros = Math.floor(centimes / 100);
  const cts = centimes % 100;
  const partEuros = `${nombreEnLettres(euros)} euro${euros > 1 ? "s" : ""}`;
  if (cts === 0) return partEuros;
  return `${partEuros} et ${nombreEnLettres(cts)} centime${cts > 1 ? "s" : ""}`;
}
