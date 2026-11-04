// La liste de la rentrée de septembre : tout ce qu'il faut remettre en route pour une
// nouvelle saison. Module pur ; les vérifications automatiques sont faites dans la page.

export type CleEtapeAuto =
  | "annuaire"
  | "agenda"
  | "vacances"
  | "cours"
  | "heures"
  | "locations"
  | "cles"
  | "documents"
  | "comptes"
  | "drive"
  | "sauvegarde";

export type CleEtapeManuelle = "cham" | "salles" | "contacts" | "forfaits" | "departs";

export interface Etape<C extends string> {
  cle: C;
  titre: string;
  lien: string;
  aide: string;
}

export const ETAPES_AUTO: Etape<CleEtapeAuto>[] = [
  { cle: "annuaire", titre: "Importer l'annuaire des élèves", lien: "/admin/annuaire-eleves", aide: "Le fichier Excel des inscriptions de l'année." },
  { cle: "agenda", titre: "Saisir l'agenda de la saison", lien: "/saison", aide: "Concerts, auditions, heures musicales, examens…" },
  { cle: "vacances", titre: "Vacances scolaires", lien: "/admin/parametres/vacances", aide: "Synchronisées automatiquement chaque lundi (zone A)." },
  { cle: "cours", titre: "Les profs créent leurs cours (Présences)", lien: "/presences", aide: "Un cours par groupe ou élève, avec sa date de début." },
  { cle: "heures", titre: "Heures hebdomadaires des contrats", lien: "/admin/parametres/profs", aide: "Pour comparer avec l'emploi du temps de chaque prof." },
  { cle: "locations", titre: "Locations d'instruments de la saison", lien: "/admin/locations", aide: "Reconduire ou créer les locations de l'année." },
  { cle: "cles", titre: "Registre des clés et badges", lien: "/admin/cles", aide: "Remises de clés de la nouvelle saison." },
  { cle: "documents", titre: "Faire re-signer les consignes de sécurité", lien: "/admin/documents", aide: "Publier une nouvelle version des documents pour la saison." },
  { cle: "comptes", titre: "Comptes des nouveaux profs", lien: "/admin/parametres/profs", aide: "Invitations envoyées et acceptées." },
  { cle: "drive", titre: "Connexion Google Drive", lien: "/admin/parametres/google-drive", aide: "Nécessaire aux documents, conventions et sauvegardes." },
  { cle: "sauvegarde", titre: "Sauvegarde de l'appli", lien: "/admin/parametres/google-drive", aide: "Une sauvegarde réussie dans les 8 derniers jours." },
];

export const ETAPES_MANUELLES: Etape<CleEtapeManuelle>[] = [
  { cle: "departs", titre: "Désactiver les comptes des profs partis", lien: "/admin/parametres/profs", aide: "Ils perdent l'accès immédiatement." },
  { cle: "cham", titre: "Mettre à jour la liste des élèves CHAM", lien: "/cham", aide: "Et les fiches d'autorisation de sortie." },
  { cle: "salles", titre: "Vérifier les salles et les créneaux récurrents", lien: "/admin/parametres/creneaux-recurrents", aide: "Nouvelles salles, salles à convention, créneaux de l'année." },
  { cle: "contacts", titre: "Vérifier les contacts des mairies", lien: "/admin/parametres/contacts", aide: "Destinataires des demandes de salle." },
  { cle: "forfaits", titre: "Mettre à jour forfaits et types de trajet", lien: "/admin/parametres/forfaits", aide: "Barèmes de l'activité accessoire et des frais." },
];

export const estEtapeManuelle = (v: string): v is CleEtapeManuelle => ETAPES_MANUELLES.some((e) => e.cle === v);

// La saison à préparer : dès juin, celle qui commence en septembre ; sinon la saison en cours.
export function saisonARentrer(aujourdHui: Date): number {
  const annee = aujourdHui.getUTCFullYear();
  return aujourdHui.getUTCMonth() >= 5 ? annee : annee - 1;
}

export const debutSaison = (saison: number) => new Date(Date.UTC(saison, 8, 1));
export const finSaison = (saison: number) => new Date(Date.UTC(saison + 1, 8, 1));
// Préparations faites dès l'été (import de l'annuaire, nouvelles versions…) : à partir du 1er juin.
export const debutPreparation = (saison: number) => new Date(Date.UTC(saison, 5, 1));
