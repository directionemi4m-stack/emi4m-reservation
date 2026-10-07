// Liste partagée par tous les sélecteurs de jour de semaine (créneaux récurrents de
// salle, cours de présences) — un seul endroit à mettre à jour si l'ordre doit changer.
export const JOURS_SEMAINE_OPTIONS = [
  { valeur: "LUNDI", label: "Lundi" },
  { valeur: "MARDI", label: "Mardi" },
  { valeur: "MERCREDI", label: "Mercredi" },
  { valeur: "JEUDI", label: "Jeudi" },
  { valeur: "VENDREDI", label: "Vendredi" },
  { valeur: "SAMEDI", label: "Samedi" },
  { valeur: "DIMANCHE", label: "Dimanche" },
] as const;

function normaliser(texte: string) {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function libelleJourSemaine(jourSemaine: string | null | undefined): string | null {
  return JOURS_SEMAINE_OPTIONS.find((j) => j.valeur === jourSemaine)?.label ?? null;
}

// L'info complémentaire d'un cours (texte libre) répétait souvent le jour, déjà porté
// par jourSemaine (« MARDI 5ème CHAM », « Vendredi ») : on retire ce jour de tête pour
// ne pas l'afficher deux fois. Renvoie null s'il ne reste rien.
export function infoSansJour(jourSemaine: string | null | undefined, jour: string | null | undefined): string | null {
  const texte = jour?.trim();
  if (!texte) return null;
  const libelle = libelleJourSemaine(jourSemaine);
  if (!libelle) return texte;
  const premierMot = texte.split(/\s+/)[0];
  if (normaliser(premierMot) !== normaliser(libelle)) return texte;
  const reste = texte.slice(premierMot.length).replace(/^[\s\-–—·,:]+/, "").trim();
  return reste || null;
}

// Libellé affiché partout pour un cours : « Mardi · 14h15 - 15h 5ème CHAM », ou juste
// « Mardi » sans info complémentaire.
export function libelleJourCours(cours: { jourSemaine: string | null; jour: string | null }): string {
  const libelle = libelleJourSemaine(cours.jourSemaine);
  const info = infoSansJour(cours.jourSemaine, cours.jour);
  return [libelle, info].filter(Boolean).join(" · ");
}
