// Bulletins CHAM : logique pure (aucun accès base), testée dans bulletinsCham.test.ts.

import { anneeScolaireDebut, libelleAnneeScolaire } from "@/lib/fraisRecap";

export const MATIERES_CHAM = [
  { valeur: "FORMATION_MUSICALE", label: "Formation musicale" },
  { valeur: "INSTRUMENT", label: "Instrument" },
  { valeur: "HISTOIRE_MUSIQUE", label: "Histoire de la musique" },
  { valeur: "PRATIQUES_COLLECTIVES", label: "Pratiques collectives" },
] as const;

export type MatiereCham = (typeof MATIERES_CHAM)[number]["valeur"];

export function libelleMatiere(matiere: string): string {
  return MATIERES_CHAM.find((m) => m.valeur === matiere)?.label ?? matiere;
}

export const TRIMESTRES = [1, 2, 3] as const;

export function libelleTrimestre(trimestre: number): string {
  return trimestre === 1 ? "1er trimestre" : `${trimestre}e trimestre`;
}

// « 1er trimestre 2026/2027 », comme sur le modèle papier.
export function libellePeriode(anneeDebut: number, trimestre: number): string {
  return `${libelleTrimestre(trimestre)} ${anneeDebut}/${anneeDebut + 1}`;
}

export { libelleAnneeScolaire };

// Dates d'un trimestre : l'annonce (ouverture des bulletins) et la relance.
export interface DatesTrimestre {
  ouverture: Date;
  relance: Date;
}
export type CalendrierBulletins = Record<number, DatesTrimestre>;

export const DELAI_RELANCE_JOURS = 4;

function jourUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function ajouterJours(date: Date, jours: number): Date {
  return new Date(date.getTime() + jours * 86_400_000);
}

// Dates habituelles : 15 novembre, 15 février, 15 mai, et relance 4 jours après.
export function calendrierParDefaut(anneeDebut: number): CalendrierBulletins {
  const ouvertures: Record<number, Date> = {
    1: new Date(Date.UTC(anneeDebut, 10, 15)),
    2: new Date(Date.UTC(anneeDebut + 1, 1, 15)),
    3: new Date(Date.UTC(anneeDebut + 1, 4, 15)),
  };
  return Object.fromEntries(TRIMESTRES.map((t) => [t, { ouverture: ouvertures[t], relance: ajouterJours(ouvertures[t], DELAI_RELANCE_JOURS) }]));
}

// Jour où les bulletins d'un trimestre sont à remplir.
export function dateOuverture(anneeDebut: number, trimestre: number, calendrier?: CalendrierBulletins): Date {
  return (calendrier ?? calendrierParDefaut(anneeDebut))[trimestre].ouverture;
}

// Le trimestre à remplir à une date donnée : celui dont l'ouverture est passée le plus
// récemment (avant la première, on peut déjà préparer le 1er trimestre).
export function periodeCourante(date: Date, calendrier?: CalendrierBulletins): { anneeDebut: number; trimestre: number } {
  const anneeDebut = anneeScolaireDebut(date);
  const jour = jourUTC(date);
  if (jour < dateOuverture(anneeDebut, 2, calendrier)) return { anneeDebut, trimestre: 1 };
  if (jour < dateOuverture(anneeDebut, 3, calendrier)) return { anneeDebut, trimestre: 2 };
  return { anneeDebut, trimestre: 3 };
}

// La campagne d'un trimestre est ouverte à partir de sa date d'ouverture.
export function campagneOuverte(date: Date, anneeDebut: number, trimestre: number, calendrier?: CalendrierBulletins): boolean {
  return jourUTC(date) >= dateOuverture(anneeDebut, trimestre, calendrier);
}

export type TypeRappel = "OUVERTURE" | "RELANCE";

// Rappel à envoyer à la date donnée (le cron passe chaque matin). Une fenêtre de quelques
// jours plutôt qu'un jour exact permet de rattraper un passage manqué ; c'est la trace en
// base des envois qui empêche les doublons. Le trimestre le plus récent passe en premier.
export function rappelDuJour(date: Date, calendrier?: CalendrierBulletins): { anneeDebut: number; trimestre: number; type: TypeRappel } | null {
  const jour = jourUTC(date);
  const anneeDebut = anneeScolaireDebut(jour);
  const dates = calendrier ?? calendrierParDefaut(anneeDebut);
  for (const trimestre of [...TRIMESTRES].reverse()) {
    const { ouverture, relance } = dates[trimestre];
    if (jour >= ouverture && jour < relance) return { anneeDebut, trimestre, type: "OUVERTURE" };
    if (jour >= relance && jour < ajouterJours(relance, 7)) return { anneeDebut, trimestre, type: "RELANCE" };
  }
  return null;
}

// Vérifie un calendrier modifié par la direction. `envoyes` contient les rappels déjà partis
// (« 1-OUVERTURE ») : ils ne bougent pas. Une date changée doit être au plus tôt demain, pour
// qu'aucun rappel ne parte par surprise au prochain passage. Renvoie le message d'erreur.
export function erreurCalendrier(params: {
  anneeDebut: number;
  calendrier: CalendrierBulletins;
  avant: CalendrierBulletins;
  envoyes: Set<string>;
  aujourdHui: Date;
}): string | null {
  const { anneeDebut, calendrier, avant, envoyes, aujourdHui } = params;
  const nom = (t: number) => (t === 1 ? "1er trimestre" : `${t}e trimestre`);
  const debut = new Date(Date.UTC(anneeDebut, 8, 1));
  const fin = new Date(Date.UTC(anneeDebut + 1, 7, 31));
  const jour = jourUTC(aujourdHui);
  for (const t of TRIMESTRES) {
    const { ouverture, relance } = calendrier[t];
    if (ouverture < debut || relance > fin) return `${nom(t)} : choisissez des dates dans l'année scolaire ${anneeDebut}-${anneeDebut + 1}.`;
    if (relance <= ouverture) return `${nom(t)} : la relance doit être après l'annonce.`;
    if (t < 3 && calendrier[t + 1].ouverture <= relance) return `L'annonce du ${nom(t + 1)} doit être après la relance du ${nom(t)}.`;
    for (const [type, valeur, ancienne, libelle] of [
      ["OUVERTURE", ouverture, avant[t].ouverture, "l'annonce"],
      ["RELANCE", relance, avant[t].relance, "la relance"],
    ] as const) {
      if (!envoyes.has(`${t}-${type}`) && valeur.getTime() !== ancienne.getTime() && valeur <= jour) {
        return `${nom(t)} : ${libelle} doit être à partir de demain.`;
      }
    }
  }
  return null;
}

// Signature dessinée à l'écran, reçue en « data URL » PNG. Refuse tout ce qui n'est pas
// une image PNG de taille raisonnable.
const TAILLE_MAX_SIGNATURE = 300_000;
const ENTETE_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function lireSignature(dataUrl: string): Buffer | null {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!m) return null;
  const buffer = Buffer.from(m[1], "base64");
  if (buffer.length < 100 || buffer.length > TAILLE_MAX_SIGNATURE) return null;
  if (!ENTETE_PNG.every((octet, i) => buffer[i] === octet)) return null;
  return buffer;
}

// « Nicolas Bercovitz - direction », d'après les coordonnées de l'école.
export function libelleDirection(nom: string | null | undefined, fonction: string | null | undefined): string {
  const n = nom?.trim();
  return n ? `${n} - ${fonction?.trim() || "direction"}` : "La direction";
}

// Une seule adresse, sans espace ni séparateur.
export const adresseValide = (a: string) => /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(a.trim());

// Classe telle qu'écrite sur le bulletin (« 5B », ou « 3e » sans division), et son niveau.
export const niveauDeClasse = (classe: string | null | undefined) => (classe ? `${classe[0]}e` : null);

// Où ranger le bulletin dans le Drive : « Bulletins 2026-2027 / 1er trimestre / 5e /
// 5B — MARTIN Léa — bulletin CHAM T1.pdf ». Sans classe connue, il reste dans le dossier
// du trimestre.
export function rangementBulletin(eleve: { prenom: string; nom: string; classe?: string | null }, anneeDebut: number, trimestre: number) {
  const niveau = niveauDeClasse(eleve.classe);
  return {
    dossiers: [`Bulletins ${anneeDebut}-${anneeDebut + 1}`, libelleTrimestre(trimestre), ...(niveau ? [niveau] : [])],
    nomFichier: `${eleve.classe ? `${eleve.classe} — ` : ""}${eleve.nom.toUpperCase()} ${eleve.prenom} — bulletin CHAM T${trimestre}.pdf`,
  };
}

// Le mail du bulletin : le même texte sert à l'aperçu de confirmation et à l'envoi réel.
export function contenuMailBulletin(eleve: { prenom: string; nom: string; classe?: string | null }, anneeDebut: number, trimestre: number) {
  const nomEleve = `${eleve.prenom} ${eleve.nom.toUpperCase()}`;
  const periode = libellePeriode(anneeDebut, trimestre);
  return {
    sujet: `Bulletin CHAM — ${periode} — ${nomEleve}`,
    titre: `Bulletin CHAM — ${periode}`,
    paragraphes: [
      "Bonjour,",
      `Veuillez trouver ci-joint le bulletin de la classe CHAM de ${nomEleve} pour le ${periode}.`,
      "Pour toute question, vous pouvez répondre directement à ce message.",
      "Bien cordialement,\nLa direction de l'EMI4M\nÉcole Musicale Itinérante des 4 Montagnes",
    ],
    nomFichier: `Bulletin CHAM T${trimestre} ${anneeDebut}-${anneeDebut + 1} - ${eleve.classe ? `${eleve.classe} - ` : ""}${eleve.nom.toUpperCase()} ${eleve.prenom}.pdf`,
  };
}

export function signatureEnDataUrl(image: Uint8Array): string {
  return `data:image/png;base64,${Buffer.from(image).toString("base64")}`;
}

// Découpe un texte en lignes qui tiennent dans une largeur donnée (mesure fournie par
// l'appelant : la police du PDF). Les retours à la ligne saisis par le prof sont gardés.
export function decouperLignes(texte: string, largeurMax: number, mesurer: (t: string) => number): string[] {
  const lignes: string[] = [];
  for (const paragraphe of texte.replace(/\r\n?/g, "\n").split("\n")) {
    const mots = paragraphe.split(/\s+/).filter(Boolean);
    if (mots.length === 0) {
      lignes.push("");
      continue;
    }
    let ligne = "";
    for (const mot of mots) {
      const essai = ligne ? `${ligne} ${mot}` : mot;
      if (mesurer(essai) <= largeurMax) {
        ligne = essai;
        continue;
      }
      if (ligne) lignes.push(ligne);
      // Un mot plus long que la ligne entière est coupé net.
      let reste = mot;
      while (mesurer(reste) > largeurMax && reste.length > 1) {
        let n = reste.length - 1;
        while (n > 1 && mesurer(reste.slice(0, n)) > largeurMax) n--;
        lignes.push(reste.slice(0, n));
        reste = reste.slice(n);
      }
      ligne = reste;
    }
    lignes.push(ligne);
  }
  return lignes;
}
