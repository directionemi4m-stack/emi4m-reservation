// Locations d'instruments : logique pure (aucun accès base), testée dans locations.test.ts.

export const MODES_PAIEMENT = [
  { valeur: "CHEQUE", label: "Chèque" },
  { valeur: "VIREMENT", label: "Virement" },
] as const;

export function libelleModePaiement(mode: string | null | undefined): string {
  return MODES_PAIEMENT.find((m) => m.valeur === mode)?.label ?? "";
}

export const CAUTIONS = [
  { valeur: "RECUE", label: "Reçue" },
  { valeur: "MANQUANTE", label: "Manquante" },
  { valeur: "RENDUE", label: "Rendue" },
] as const;

export function libelleCaution(caution: string | null | undefined): string {
  return CAUTIONS.find((c) => c.valeur === caution)?.label ?? "À renseigner";
}

// 1 → « 1re année », 2 → « 2e année »…
export function libelleAnneeLocation(n: number): string {
  return n === 1 ? "1re année" : `${n}e année`;
}

export function libelleSaison(anneeDebut: number): string {
  return `${anneeDebut}-${anneeDebut + 1}`;
}

// Clé de rapprochement d'un élève d'une saison à l'autre, insensible à la casse et aux
// accents (« Léa LASCURETTES » = « lea lascurettes »).
export function cleEleve(prenom: string, nom: string): string {
  return `${prenom} ${nom}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export interface LocationReconductible {
  instrument: string;
  prenom: string;
  nom: string;
  anneeLocation: number;
  nbMois: number | null;
  caution: "RECUE" | "MANQUANTE" | "RENDUE" | null;
}

// Prépare la saison suivante à partir des locations d'une saison : chaque location passe
// à l'année suivante, non payée, sans commentaire. Une caution reçue reste acquise (elle
// couvre l'instrument tant qu'il est loué) ; une caution rendue est à redemander. Les
// élèves déjà présents dans la nouvelle saison ne sont pas dupliqués.
export function reconduire<T extends LocationReconductible>(
  precedentes: T[],
  dejaPresentes: { prenom: string; nom: string; instrument: string }[]
): LocationReconductible[] {
  const presentes = new Set(dejaPresentes.map((l) => `${cleEleve(l.prenom, l.nom)}|${l.instrument.toLowerCase()}`));
  return precedentes
    .filter((l) => !presentes.has(`${cleEleve(l.prenom, l.nom)}|${l.instrument.toLowerCase()}`))
    .map((l) => ({
      instrument: l.instrument,
      prenom: l.prenom,
      nom: l.nom,
      anneeLocation: l.anneeLocation + 1,
      nbMois: l.nbMois,
      caution: l.caution === "RENDUE" ? null : l.caution,
    }));
}

// Une cellule écrite telle quelle dans Google Sheets : un texte commençant par =, +, - ou @
// serait pris pour une formule, on le neutralise.
export function celluleTexte(texte: string | null | undefined): string {
  const t = texte ?? "";
  return /^[=+\-@]/.test(t) ? `'${t}` : t;
}
