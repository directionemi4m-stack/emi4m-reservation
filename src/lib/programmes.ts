// Programmes des événements de la saison (œuvres jouées à chaque passage) et relevé pour
// la SACEM. Module pur, testé dans programmes.test.ts.
import { lireMinutage } from "@/lib/saison";

// Les profs inscrivent leurs élèves et le programme joué sur tous les événements, sauf
// les réunions.
export const acceptePassages = (type: string) => type !== "REUNION";

// Le relevé SACEM ne reprend que les représentations : pas les réunions ni les examens.
export const TYPES_SACEM = ["HEURE_MUSICALE", "CONCERT", "AUDITION", "AUTRE"] as const;

export interface Morceau {
  titre: string;
  compositeur: string;
  arrangeur: string | null;
  dureeSecondes: number;
}

// « Menuet en sol (J.S. Bach) ; Le Cygne (C. Saint-Saëns, arr. M. Durand) »
export function resumeProgramme(morceaux: Pick<Morceau, "titre" | "compositeur" | "arrangeur">[]): string {
  return morceaux
    .map((m) => `${m.titre} (${[m.compositeur, m.arrangeur && `arr. ${m.arrangeur}`].filter(Boolean).join(", ")})`)
    .join(" ; ");
}

// Lit les lignes d'œuvres du formulaire (champs répétés), en ignorant les lignes vides.
export function lireMorceaux(champs: {
  titres: string[];
  compositeurs: string[];
  arrangeurs: string[];
  durees: string[];
}): { morceaux: Morceau[] } | { erreur: string } {
  const morceaux: Morceau[] = [];
  for (let i = 0; i < champs.titres.length; i++) {
    const titre = champs.titres[i]?.trim() ?? "";
    const compositeur = champs.compositeurs[i]?.trim() ?? "";
    const arrangeur = champs.arrangeurs[i]?.trim() || null;
    const duree = champs.durees[i]?.trim() ?? "";
    if (!titre && !compositeur && !arrangeur && !duree) continue;
    const n = morceaux.length + 1;
    if (!titre) return { erreur: `Œuvre ${n} : le titre est requis.` };
    if (!compositeur) return { erreur: `« ${titre} » : le compositeur est requis (écrire « Traditionnel » ou « Anonyme » si besoin).` };
    const dureeSecondes = lireMinutage(duree);
    if (dureeSecondes === null) return { erreur: `« ${titre} » : durée invalide (ex. 3'30).` };
    morceaux.push({ titre, compositeur, arrangeur, dureeSecondes });
  }
  if (morceaux.length === 0) return { erreur: "Indiquez au moins une œuvre jouée." };
  return { morceaux };
}

export interface Coordonnees {
  nom: string;
  sigle: string;
  adresse: string;
  telephone: string | null;
  email: string | null;
  siteWeb: string | null;
  siret: string | null;
  numeroSacem: string | null;
  representant: string | null;
}

// Valeurs proposées tant que la direction n'a rien enregistré (cf. Paramètres › Coordonnées).
export const COORDONNEES_DEFAUT: Coordonnees = {
  nom: "École Musicale Itinérante des 4 Montagnes",
  sigle: "EMI4M",
  adresse: "133 rue du Lycée Polonais\n38250 Villard-de-Lans",
  telephone: "06 95 85 91 77",
  email: "info.emi4m@gmail.com",
  siteWeb: null,
  siret: null,
  numeroSacem: null,
  representant: null,
};
