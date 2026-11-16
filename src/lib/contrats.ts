// Contrats et avenants des profs : règles pures (statut, noms de fichiers, paraphe).

export type StatutContrat = "PAPIER" | "BROUILLON" | "PRESIDENCE" | "PROF" | "SIGNE";

export const LIBELLE_TYPE_CONTRAT = { CONTRAT: "Contrat", AVENANT: "Avenant" } as const;

export const LIBELLE_STATUT_CONTRAT: Record<StatutContrat, string> = {
  PAPIER: "Signé sur papier",
  BROUILLON: "Pas encore envoyé",
  PRESIDENCE: "Attend la présidence",
  PROF: "Attend le prof",
  SIGNE: "Signé par les deux",
};

export function statutContrat(c: { papier: boolean; envoyeLe: Date | null; presidenceSigneLe: Date | null; profSigneLe: Date | null }): StatutContrat {
  if (c.papier) return "PAPIER";
  if (c.profSigneLe) return "SIGNE";
  if (c.presidenceSigneLe) return "PROF";
  if (c.envoyeLe) return "PRESIDENCE";
  return "BROUILLON";
}

// Durée de validité du lien de signature envoyé à la présidence.
export const VALIDITE_LIEN_JOURS = 30;

// « 2026-2027 Contrat - RIVAL Jeanne - CDI temps partiel signé.pdf »
export function nomFichierContrat(c: { anneeDebut: number; type: "CONTRAT" | "AVENANT"; titre: string; prof: { prenom: string; nom: string } }, signe: boolean) {
  const brut = `${c.anneeDebut}-${c.anneeDebut + 1} ${LIBELLE_TYPE_CONTRAT[c.type]} - ${c.prof.nom.toUpperCase()} ${c.prof.prenom} - ${c.titre}${signe ? " signé" : ""}`;
  return `${brut.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 180)}.pdf`;
}

// Nom de dossier d'un prof dans le Drive : « RIVAL Jeanne ».
export const dossierProf = (p: { prenom: string; nom: string }) => `${p.nom.toUpperCase()} ${p.prenom}`.trim();
