// Bulletins CHAM : logique pure (aucun accès base), testée dans bulletinsCham.test.ts.

import { anneeScolaireDebut, libelleAnneeScolaire } from "@/lib/fraisRecap";

export const MATIERES_CHAM = [
  { valeur: "FORMATION_MUSICALE", label: "Formation musicale" },
  { valeur: "INSTRUMENT", label: "Instrument" },
  { valeur: "HISTOIRE_MUSIQUE", label: "Histoire de la musique" },
  { valeur: "PRATIQUES_COLLECTIVES", label: "Pratiques collectives" },
] as const;

export type MatiereCham = (typeof MATIERES_CHAM)[number]["valeur"];

export function libelleMatiere(matiere: string): string {
  return MATIERES_CHAM.find((m) => m.valeur === matiere)?.label ?? matiere;
}

export const TRIMESTRES = [1, 2, 3] as const;

export function libelleTrimestre(trimestre: number): string {
  return trimestre === 1 ? "1er trimestre" : `${trimestre}e trimestre`;
}

// « 1er trimestre 2026/2027 », comme sur le modèle papier.
export function libellePeriode(anneeDebut: number, trimestre: number): string {
  return `${libelleTrimestre(trimestre)} ${anneeDebut}/${anneeDebut + 1}`;
}

export { libelleAnneeScolaire };

// Jour où les bulletins de chaque trimestre sont à remplir : 15 novembre, 15 février, 15 mai.
export function dateOuverture(anneeDebut: number, trimestre: number): Date {
  if (trimestre === 1) return new Date(Date.UTC(anneeDebut, 10, 15));
  if (trimestre === 2) return new Date(Date.UTC(anneeDebut + 1, 1, 15));
  return new Date(Date.UTC(anneeDebut + 1, 4, 15));
}

export const DELAI_RELANCE_JOURS = 4;

function jourUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function ajouterJours(date: Date, jours: number): Date {
  return new Date(date.getTime() + jours * 86_400_000);
}

// Le trimestre à remplir à une date donnée : celui dont le 15 est passé le plus récemment
// (avant le 15 novembre, on peut déjà préparer le 1er trimestre).
export function periodeCourante(date: Date): { anneeDebut: number; trimestre: number } {
  const anneeDebut = anneeScolaireDebut(date);
  const jour = jourUTC(date);
  if (jour < dateOuverture(anneeDebut, 2)) return { anneeDebut, trimestre: 1 };
  if (jour < dateOuverture(anneeDebut, 3)) return { anneeDebut, trimestre: 2 };
  return { anneeDebut, trimestre: 3 };
}

// La campagne d'un trimestre est ouverte à partir de son 15.
export function campagneOuverte(date: Date, anneeDebut: number, trimestre: number): boolean {
  return jourUTC(date) >= dateOuverture(anneeDebut, trimestre);
}

export type TypeRappel = "OUVERTURE" | "RELANCE";

// Rappel à envoyer à la date donnée (le cron passe chaque matin). Une fenêtre de quelques
// jours plutôt qu'un jour exact permet de rattraper un passage manqué ; c'est la trace en
// base des envois qui empêche les doublons.
export function rappelDuJour(date: Date): { anneeDebut: number; trimestre: number; type: TypeRappel } | null {
  const jour = jourUTC(date);
  const anneeDebut = anneeScolaireDebut(jour);
  for (const trimestre of TRIMESTRES) {
    const ouverture = dateOuverture(anneeDebut, trimestre);
    const relance = ajouterJours(ouverture, DELAI_RELANCE_JOURS);
    if (jour >= ouverture && jour < relance) return { anneeDebut, trimestre, type: "OUVERTURE" };
    if (jour >= relance && jour < ajouterJours(relance, 7)) return { anneeDebut, trimestre, type: "RELANCE" };
  }
  return null;
}

// Signature dessinée à l'écran, reçue en « data URL » PNG. Refuse tout ce qui n'est pas
// une image PNG de taille raisonnable.
const TAILLE_MAX_SIGNATURE = 300_000;
const ENTETE_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function lireSignature(dataUrl: string): Buffer | null {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!m) return null;
  const buffer = Buffer.from(m[1], "base64");
  if (buffer.length < 100 || buffer.length > TAILLE_MAX_SIGNATURE) return null;
  if (!ENTETE_PNG.every((octet, i) => buffer[i] === octet)) return null;
  return buffer;
}

export function signatureEnDataUrl(image: Uint8Array): string {
  return `data:image/png;base64,${Buffer.from(image).toString("base64")}`;
}

// Découpe un texte en lignes qui tiennent dans une largeur donnée (mesure fournie par
// l'appelant : la police du PDF). Les retours à la ligne saisis par le prof sont gardés.
export function decouperLignes(texte: string, largeurMax: number, mesurer: (t: string) => number): string[] {
  const lignes: string[] = [];
  for (const paragraphe of texte.replace(/\r\n?/g, "\n").split("\n")) {
    const mots = paragraphe.split(/\s+/).filter(Boolean);
    if (mots.length === 0) {
      lignes.push("");
      continue;
    }
    let ligne = "";
    for (const mot of mots) {
      const essai = ligne ? `${ligne} ${mot}` : mot;
      if (mesurer(essai) <= largeurMax) {
        ligne = essai;
        continue;
      }
      if (ligne) lignes.push(ligne);
      // Un mot plus long que la ligne entière est coupé net.
      let reste = mot;
      while (mesurer(reste) > largeurMax && reste.length > 1) {
        let n = reste.length - 1;
        while (n > 1 && mesurer(reste.slice(0, n)) > largeurMax) n--;
        lignes.push(reste.slice(0, n));
        reste = reste.slice(n);
      }
      ligne = reste;
    }
    lignes.push(ligne);
  }
  return lignes;
}
