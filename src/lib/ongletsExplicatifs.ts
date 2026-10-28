// Contenu des deux onglets d'explication placés en tête du classeur Comptabilité, à
// l'intention du comptable. Générés depuis les données de l'appli (barème, types
// d'événement « toujours payés ») : ils restent à jour quand la direction les modifie.
// Module pur, testé dans ongletsExplicatifs.test.ts.

import { tauxExact } from "@/lib/fraisRecap";
import { SEMAINES_FORFAIT } from "@/lib/forfaitAccessoire";

type Cellule = string | number;

export interface ContenuOnglet {
  lignes: Cellule[][];
  titres: number[]; // indices (0-based) des lignes à mettre en gras
}

export const TITRE_ONGLET_BAREME = "Barème de déplacement";
export const TITRE_ONGLET_ACTIVITE = "Activité accessoire — règles";

class Redaction {
  lignes: Cellule[][] = [];
  titres: number[] = [];
  titre(texte: string) {
    if (this.lignes.length > 0) this.lignes.push([]);
    this.titres.push(this.lignes.length);
    this.lignes.push([texte]);
  }
  texte(...lignes: string[]) {
    for (const l of lignes) this.lignes.push([l]);
  }
  ligne(...cellules: Cellule[]) {
    this.lignes.push(cellules);
  }
  entete(...cellules: Cellule[]) {
    this.titres.push(this.lignes.length);
    this.lignes.push(cellules);
  }
}

export function contenuOngletBareme(types: { nom: string; km: number; prix: number }[]): ContenuOnglet {
  const r = new Redaction();
  r.titre("Barème des frais de déplacement — EMI4M");
  r.texte(
    "Chaque trajet saisi par un salarié est payé au montant forfaitaire du barème ci-dessous : c'est ce montant qui fait foi.",
    "Le montant est enregistré au moment de la saisie : si le barème change, les trajets déjà saisis gardent leur montant d'origine."
  );

  r.titre("Le taux au kilomètre");
  r.texte(
    "Le barème fixe un montant par trajet, pas un taux. Le taux affiché vaut montant ÷ km, donné à 6 décimales.",
    "Ne pas l'arrondir à 2 décimales : km × taux ne retomberait plus sur le montant du barème",
    "(ex. Villard/Autrans : 36 km × 0,18 = 6,48 € au lieu de 6,40 €). À 6 décimales, km × taux redonne le montant au centime."
  );

  r.titre("Barème en vigueur");
  r.entete("Trajet", "Km", "Montant (€)", "Taux (€/km)");
  for (const t of [...types].sort((a, b) => a.nom.localeCompare(b.nom, "fr"))) {
    r.ligne(t.nom, t.km, t.prix, tauxExact(t.prix, t.km));
  }

  r.titre("Lire l'onglet d'un salarié (« Prénom Nom »)");
  r.texte(
    "• En haut : sa fiche (adresse, permis, véhicule, puissance fiscale) et les totaux km et € de tous ses trajets.",
    "• À partir de la ligne 15 : un trajet par ligne, dans l'ordre de saisie (date, mission, trajet, km, €).",
    "• Un trajet supprimé par le salarié reste à sa place, marqué « (supprimé) », km et € vidés : il n'est plus compté.",
    "  Ainsi, vos statuts et commentaires restent toujours sur la bonne ligne.",
    "• Colonne « Statut de paiement » : la seule que vous pouvez modifier (ex. « Payé le 25/11/2026 »). L'application n'y touche jamais.",
    "• À droite : le récapitulatif par mois de l'année scolaire (septembre → août), détaillé par destination, puis le total de l'année."
  );

  r.titre("À savoir");
  r.texte(
    "Les onglets sont mis à jour automatiquement par l'application à chaque saisie et sont verrouillés contre les modifications accidentelles.",
    "Pour toute correction (trajet, montant, fiche), merci de contacter la direction. Vous pouvez laisser des commentaires sur n'importe quelle cellule."
  );
  return { lignes: r.lignes, titres: r.titres };
}

export function contenuOngletActivite(typesToujoursPayes: string[]): ContenuOnglet {
  const r = new Redaction();
  r.titre("Activité accessoire — règles de calcul");
  r.texte(
    "L'activité accessoire regroupe les heures faites pour l'école en dehors des cours : réunions, concerts, heures musicales, examens, répétitions…"
  );

  r.titre("Le forfait annuel (heures dues, comprises dans le contrat)");
  r.texte(
    `Chaque salarié doit à l'école, par année scolaire, un forfait égal à son volume horaire hebdomadaire × ${SEMAINES_FORFAIT}.`,
    `Exemple : 5 h de cours par semaine → 5 × ${SEMAINES_FORFAIT} = 30 h d'activité accessoire dues sur l'année.`,
    "Les heures prises sur ce forfait ne sont pas payées en plus.",
    "Le volume horaire hebdomadaire est saisi par la direction pour chaque année scolaire."
  );

  r.titre("Au-delà du forfait : le dépassement");
  r.texte(
    "Les heures faites au-delà du forfait sont payées au salarié en fin d'année scolaire",
    "(ligne « Dépassement à payer en fin d'année » du bilan)."
  );

  r.titre("Heures hors forfait : payées dans tous les cas");
  r.texte(
    "Ces heures sont payées dès le mois où elles ont lieu, sans entamer le forfait :",
    typesToujoursPayes.length > 0
      ? `• les activités de type : ${typesToujoursPayes.join(", ")} ;`
      : "• (aucun type d'activité n'est actuellement payé hors forfait d'office) ;",
    "• les heures bénéficiant d'un financement exceptionnel, signalées « hors forfait (financement exceptionnel) »."
  );

  r.titre("Lire l'onglet d'un salarié (« Prénom Nom — Activité accessoire »)");
  r.texte(
    "• À gauche : une activité par ligne (date, type, durée) ; les lignes hors forfait sont signalées « — hors forfait ».",
    "• Une activité supprimée reste à sa place, marquée « (supprimé) », durée vidée : elle n'est plus comptée.",
    "• Colonne « Statut de paiement » : la seule que vous pouvez modifier. L'application n'y touche jamais.",
    "• À droite, par mois : « Au forfait (h) » = heures prises sur le forfait ; « Hors forfait à payer (h) » = heures à payer ce mois-là.",
    "• En dessous, le bilan de l'année : heures hebdo du contrat, forfait, heures faites, reste, dépassement à payer en fin d'année, total.",
    "• Tant que la direction n'a pas saisi les heures hebdo d'un salarié, le bilan l'indique et le dépassement n'est pas calculé.",
    "• Les heures sont en décimal : 1,5 = 1 h 30 ; 0,75 = 45 min."
  );
  return { lignes: r.lignes, titres: r.titres };
}
