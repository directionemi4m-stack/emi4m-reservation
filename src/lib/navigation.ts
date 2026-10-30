// Organisation de l'appli en rubriques et tuiles, à la manière de Home Assistant : une
// seule source pour la page d'accueil, le menu latéral (ordinateur), la barre du bas
// (téléphone) et l'écran « Plus ». Module pur, utilisable côté client comme serveur.

// Une couleur par domaine, la même partout : bleu = réservation des salles, vert = cours
// et présences, ambre = frais, neutre = vie de l'école et administration.
export type CouleurTuile = "bleu" | "vert" | "ambre" | "neutre";

export type CleIcone =
  | "accueil"
  | "calendrier"
  | "presences"
  | "horloge"
  | "porte"
  | "voiture"
  | "musique"
  | "fiche"
  | "saison"
  | "ecole"
  | "annuaire"
  | "securite"
  | "boite"
  | "profs"
  | "parametres"
  | "plus"
  | "tableau"
  | "salle"
  | "contacts"
  | "lieux"
  | "vacances"
  | "trajet"
  | "evenement"
  | "forfait"
  | "drive"
  | "journal"
  | "bulletin";

export interface LienNav {
  href: string;
  label: string;
  icone: CleIcone;
  couleur: CouleurTuile;
}

export interface SectionNav {
  titre: string;
  liens: LienNav[];
  direction?: boolean; // réservée à la direction
}

export const SECTIONS: SectionNav[] = [
  {
    titre: "Ma semaine",
    liens: [
      { href: "/planning", label: "Planning", icone: "calendrier", couleur: "bleu" },
      { href: "/presences", label: "Présences", icone: "presences", couleur: "vert" },
      { href: "/agenda", label: "Emploi du temps", icone: "horloge", couleur: "vert" },
      { href: "/demandes", label: "Mes demandes", icone: "porte", couleur: "bleu" },
    ],
  },
  {
    titre: "Frais et activités",
    liens: [
      { href: "/frais", label: "Frais km", icone: "voiture", couleur: "ambre" },
      { href: "/activite-accessoire", label: "Activité acc.", icone: "musique", couleur: "ambre" },
      { href: "/frais/identite", label: "Ma fiche", icone: "fiche", couleur: "ambre" },
    ],
  },
  {
    titre: "L'école",
    liens: [
      { href: "/saison", label: "Saison", icone: "saison", couleur: "neutre" },
      { href: "/cham", label: "CHAM", icone: "ecole", couleur: "neutre" },
      { href: "/bulletins-cham", label: "Bulletins CHAM", icone: "bulletin", couleur: "vert" },
      { href: "/annuaire", label: "Annuaire", icone: "annuaire", couleur: "neutre" },
      { href: "/securite", label: "Sécurité", icone: "securite", couleur: "neutre" },
    ],
  },
  {
    titre: "Direction",
    direction: true,
    liens: [
      { href: "/admin/demandes", label: "À traiter", icone: "boite", couleur: "neutre" },
      { href: "/admin/parametres/profs", label: "Profs", icone: "profs", couleur: "neutre" },
      { href: "/admin/parametres", label: "Paramètres", icone: "parametres", couleur: "neutre" },
    ],
  },
];

// Écran « Paramètres » de la direction : tout ce qui se règle une fois de temps en temps.
export const PARAMETRES: LienNav[] = [
  { href: "/admin/tableau-de-bord", label: "Tableau de bord", icone: "tableau", couleur: "neutre" },
  { href: "/admin/parametres/salles", label: "Salles", icone: "salle", couleur: "bleu" },
  { href: "/admin/parametres/creneaux-recurrents", label: "Créneaux des salles", icone: "calendrier", couleur: "bleu" },
  { href: "/admin/parametres/contacts", label: "Contacts", icone: "contacts", couleur: "bleu" },
  { href: "/admin/parametres/presences", label: "Lieux et niveaux", icone: "lieux", couleur: "vert" },
  { href: "/admin/parametres/vacances", label: "Vacances", icone: "vacances", couleur: "vert" },
  { href: "/admin/parametres/trajets", label: "Types de trajet", icone: "trajet", couleur: "ambre" },
  { href: "/admin/parametres/types-evenement", label: "Types d'événement", icone: "evenement", couleur: "ambre" },
  { href: "/admin/parametres/forfaits", label: "Forfaits", icone: "forfait", couleur: "ambre" },
  { href: "/admin/parametres/securite", label: "Sécurité", icone: "securite", couleur: "neutre" },
  { href: "/admin/parametres/google-drive", label: "Google Drive", icone: "drive", couleur: "neutre" },
  { href: "/admin/parametres/journal-impersonation", label: "Journal", icone: "journal", couleur: "neutre" },
];

// Barre du bas sur téléphone : les pages les plus utilisées, « Plus » pour tout le reste.
export const BARRE_MOBILE: LienNav[] = [
  { href: "/accueil", label: "Accueil", icone: "accueil", couleur: "neutre" },
  { href: "/planning", label: "Planning", icone: "calendrier", couleur: "bleu" },
  { href: "/presences", label: "Présences", icone: "presences", couleur: "vert" },
  { href: "/saison", label: "Saison", icone: "saison", couleur: "neutre" },
  { href: "/menu", label: "Plus", icone: "plus", couleur: "neutre" },
];

export function sectionsPour(estAdmin: boolean): SectionNav[] {
  return SECTIONS.filter((s) => !s.direction || estAdmin);
}

// Lien actif : la page elle-même ou l'une de ses sous-pages, en retenant le lien le plus
// précis (« /frais/identite » ne doit pas aussi allumer « /frais »).
export function lienActif(pathname: string, liens: { href: string }[]): string | null {
  const candidats = liens
    .map((l) => l.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length);
  return candidats[0] ?? null;
}
