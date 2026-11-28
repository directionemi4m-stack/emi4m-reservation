// Documents de l'école à consulter (sans signature), repérés par une clé fixe : chacun a
// sa page (/documents-ecole/<clé>) et sa tuile dans « L'école ».
export const DOCUMENTS_ECOLE = {
  "reglement-interieur": { titre: "Règlement intérieur", nom: "le règlement intérieur" },
  "projet-etablissement": { titre: "Projet d'établissement", nom: "le projet d'établissement" },
} as const;

export type CleDocumentEcole = keyof typeof DOCUMENTS_ECOLE;

export function documentEcole(cle: string) {
  return Object.hasOwn(DOCUMENTS_ECOLE, cle) ? { cle: cle as CleDocumentEcole, ...DOCUMENTS_ECOLE[cle as CleDocumentEcole] } : null;
}
