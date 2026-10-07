// Contenu modifiable des consignes de sécurité d'un bâtiment, calqué sur l'affiche
// officielle (Consignes_securite_EMI4M_Villard.pdf). Les gestes réflexes de l'affiche
// (« Déclencher l'alarme », « Garder son calme »…) sont fixes et vivent dans la page ;
// seules les informations propres au bâtiment sont ici. Module pur (aucun accès base),
// utilisable côté client comme côté serveur.

export interface Contact {
  libelle: string;
  telephone: string;
}

export interface ConsignesContenu {
  nomEtablissement: string;
  adresse: string;
  incendie: {
    prevenir: Contact[];
    numeroSecours: string;
    equipiers: string[];
  };
  evacuation: {
    pointRassemblement: string;
    guideFile: string;
    serreFile: string;
  };
  accident: {
    numeroSecours: string;
    defibrillateur: string;
    secouristes: string[];
    trousseUrgence: string;
  };
}

export const SITE_VILLARD = "villard";

// Valeurs de l'affiche d'origine, utilisées tant que la direction n'a rien modifié.
export const CONSIGNES_VILLARD_DEFAUT: ConsignesContenu = {
  nomEtablissement: "École Musicale Itinérante des 4 Montagnes (EMI4M)",
  adresse: "133 rue du Lycée Polonais, 38250 Villard-de-Lans",
  incendie: {
    prevenir: [
      { libelle: "La direction", telephone: "06 95 85 91 77" },
      { libelle: "Mairie de Villard-de-Lans", telephone: "04 76 94 50 00" },
    ],
    numeroSecours: "18 ou 112",
    equipiers: ["Le directeur", "Le secrétariat", "Tout adulte formé"],
  },
  evacuation: {
    pointRassemblement: "Parking devant le bâtiment",
    guideFile: "Le professeur",
    serreFile: "Le dernier adulte sorti de l'étage",
  },
  accident: {
    numeroSecours: "15 ou 112",
    defibrillateur: "À côté de la porte d'entrée du cinéma",
    secouristes: ["Le professeur présent", "Le directeur", "Le secrétariat"],
    trousseUrgence: "Secrétariat / bureau de la direction",
  },
};

// Lignes non vides d'un champ « une entrée par ligne ».
export function lignes(texte: string): string[] {
  return texte
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

// « La direction : 06 95 85 91 77 » → { libelle, telephone }. Le numéro est ce qui suit
// le dernier « : » ; une ligne sans « : » est gardée comme libellé seul.
export function lireContact(ligne: string): Contact {
  const i = ligne.lastIndexOf(":");
  if (i === -1) return { libelle: ligne.trim(), telephone: "" };
  return { libelle: ligne.slice(0, i).trim(), telephone: ligne.slice(i + 1).trim() };
}

export function ecrireContact(c: Contact): string {
  return c.telephone ? `${c.libelle} : ${c.telephone}` : c.libelle;
}

// Découpe « 18 ou 112 » / « 06 95 85 91 77 » en numéros composables individuellement.
export function numeros(texte: string): string[] {
  return texte
    .split(/\s+ou\s+|\/|,/i)
    .map((n) => n.trim())
    .filter((n) => /\d/.test(n));
}
