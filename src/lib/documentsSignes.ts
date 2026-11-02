// Documents à lire et signer par tous les salariés : règles communes à la page des profs,
// à celle de la direction et au rappel automatique. Module pur.

export const ATTESTATION_DEFAUT = "Je certifie avoir lu et compris ce document.";
export const TITRE_MAX = 120;
export const ATTESTATION_MAX = 500;
export const TAILLE_MAX_PDF = 10 * 1024 * 1024;

// Les retardataires sont relancés une fois, une semaine après la publication de la version.
export const DELAI_RELANCE_JOURS = 7;

export function relanceDue(publieLe: Date, maintenant: Date): boolean {
  return maintenant.getTime() - publieLe.getTime() >= DELAI_RELANCE_JOURS * 24 * 60 * 60 * 1000;
}

export const estPdf = (octets: Uint8Array) =>
  octets.length > 4 && octets[0] === 0x25 && octets[1] === 0x50 && octets[2] === 0x44 && octets[3] === 0x46; // %PDF

// « Procédure d'évacuation » à partir de « Procedure_evacuation_EMI4M_Villard_1.pdf » : simple
// proposition, modifiable avant publication.
export function titreDepuisNomFichier(nom: string): string {
  const base = nom
    .replace(/\.pdf$/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+\d+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "";
}

const sansCaracteresInterdits = (t: string) =>
  t
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const dateCourte = (d: Date) => d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });

// Noms des fichiers rangés dans le Drive.
export function nomCopieSignee(p: { titre: string; version: number; prenom: string; nom: string }) {
  return `${sansCaracteresInterdits(`${p.nom.toUpperCase()} ${p.prenom}`)} - ${sansCaracteresInterdits(p.titre)} v${p.version} signé.pdf`;
}

export function nomRegistre(p: { titre: string; version: number }) {
  return `Registre des signatures - ${sansCaracteresInterdits(p.titre)} v${p.version}.pdf`;
}

export const nomDossierDocument = (titre: string) => sansCaracteresInterdits(titre) || "Document";

export interface EtatSignataire {
  userId: string;
  signeLe: Date | null;
}

// Qui a signé la version en cours, qui ne l'a pas encore fait (dans l'ordre des signataires).
export function avancement(signataires: { id: string }[], signatures: { userId: string; signeLe: Date }[]) {
  const parUser = new Map(signatures.map((s) => [s.userId, s.signeLe]));
  const etats: EtatSignataire[] = signataires.map((p) => ({ userId: p.id, signeLe: parUser.get(p.id) ?? null }));
  return { etats, signes: etats.filter((e) => e.signeLe).length, total: etats.length };
}
