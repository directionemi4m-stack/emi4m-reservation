import { google } from "googleapis";
import { db } from "@/lib/db";
import type { StatutPresence, TypeAbsenceProf, TypeCours } from "@/generated/prisma/client";
import { libelleMission } from "@/lib/mission";
import { recapMensuelActivites, recapMensuelFrais } from "@/lib/fraisRecap";
import {
  contenuOngletActivite,
  contenuOngletBareme,
  TITRE_ONGLET_ACTIVITE,
  TITRE_ONGLET_BAREME,
} from "@/lib/ongletsExplicatifs";
import { libelleJourCours, libelleJourSemaine } from "@/lib/joursSemaine";
import { formaterDuree, heuresDecimales, minutesHebdo, minutesVersHeure, volumeHebdoMinutes } from "@/lib/agenda";
import { formaterMinutage, grouperParMois, libelleLieu, libelleTypeEvenement } from "@/lib/saison";
import { celluleTexte, libelleAnneeLocation, libelleModePaiement, libelleSaison } from "@/lib/locations";

const LIBELLES_STATUT: Record<StatutPresence, string> = {
  PRESENT: "Présent",
  ABSENT: "Absent",
  EXCUSE: "Excusé",
};

const LIBELLES_TYPE_ABSENCE: Record<TypeAbsenceProf, string> = {
  RATTRAPAGE: "Rattrapage",
  ARRET_MALADIE: "Arrêt maladie",
};

function creerClientSheets(idFeuille: string | undefined) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const cle = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !cle || !idFeuille) return null;

  const auth = new google.auth.JWT({
    email,
    key: cle.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return { sheets: google.sheets({ version: "v4", auth }), idFeuille };
}

// Classeur « Feuilles de présence » : présences et absences profs — jamais montré
// au comptable (données pédagogiques concernant des élèves).
function creerClientPresences() {
  return creerClientSheets(process.env.GOOGLE_SHEETS_ID);
}

// Classeur « Comptabilité » séparé : frais de déplacement et activité accessoire —
// celui-là seul est destiné à être partagé (en commentateur) avec le comptable.
function creerClientCompta() {
  return creerClientSheets(process.env.GOOGLE_SHEETS_COMPTA_ID);
}

// Classeur « Emplois du temps » : emploi du temps détaillé de chaque prof et volumes
// horaires — réservé à la direction (noms d'élèves, donc jamais dans la Comptabilité).
function creerClientEmploisDuTemps() {
  return creerClientSheets(process.env.GOOGLE_SHEETS_EDT_ID);
}

// Les titres d'onglet Google Sheets interdisent []*?/\: et sont limités à 100 caractères.
function sanitiserNomOnglet(brut: string, secours: string) {
  return brut.replace(/[[\]*?/\\:]/g, " ").trim().slice(0, 100) || secours;
}

function nomOnglet(classe: { emoji: string; nom: string }) {
  return sanitiserNomOnglet(`${classe.emoji} ${classe.nom}`, "Cours");
}

function nomOngletProf(prof: { prenom: string; nom: string }) {
  return sanitiserNomOnglet(`${prof.prenom} ${prof.nom}`, "Prof");
}

async function idOngletExistant(sheets: ReturnType<typeof google.sheets>, idFeuille: string, titre: string) {
  const { data } = await sheets.spreadsheets.get({ spreadsheetId: idFeuille });
  return data.sheets?.find((s) => s.properties?.title === titre)?.properties?.sheetId ?? null;
}

// Retrouve l'onglet d'un cours par son nom de discipline, quel que soit l'emoji utilisé
// à sa création (chaque classe choisit le sien) — évite de dupliquer l'onglet si un
// deuxième groupe de la même discipline a été créé avec une icône différente.
async function ongletCoursExistant(sheets: ReturnType<typeof google.sheets>, idFeuille: string, nom: string) {
  const { data } = await sheets.spreadsheets.get({ spreadsheetId: idFeuille });
  const trouve = data.sheets?.find((s) => {
    const titre = s.properties?.title ?? "";
    return titre === nom || titre.endsWith(` ${nom}`);
  });
  return trouve?.properties?.sheetId != null
    ? { id: trouve.properties.sheetId, titre: trouve.properties.title! }
    : null;
}

const COULEURS_STATUT: Record<StatutPresence, { red: number; green: number; blue: number }> = {
  PRESENT: { red: 0.85, green: 0.94, blue: 0.85 },
  ABSENT: { red: 0.96, green: 0.8, blue: 0.8 },
  EXCUSE: { red: 1, green: 0.93, blue: 0.7 },
};

const COULEURS_TYPE_ABSENCE: Record<TypeAbsenceProf, { red: number; green: number; blue: number }> = {
  RATTRAPAGE: { red: 0.82, green: 0.88, blue: 0.98 },
  ARRET_MALADIE: { red: 0.96, green: 0.8, blue: 0.8 },
};

// Colore une cellule dès que son texte correspond exactement à une valeur donnée — la
// règle reste active même après relecture manuelle du Sheet, pas besoin de la reposer à chaque sync.
async function appliquerMiseEnFormeCouleur(
  sheets: ReturnType<typeof google.sheets>,
  idFeuille: string,
  sheetId: number,
  colonne: { debut: number; fin: number },
  couleursParTexte: Record<string, { red: number; green: number; blue: number }>
) {
  const plage = {
    sheetId,
    startRowIndex: 1,
    endRowIndex: 1000,
    startColumnIndex: colonne.debut,
    endColumnIndex: colonne.fin,
  };
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: idFeuille,
    requestBody: {
      requests: Object.entries(couleursParTexte).map(([texte, couleur]) => ({
        addConditionalFormatRule: {
          rule: {
            ranges: [plage],
            booleanRule: {
              condition: { type: "TEXT_EQ", values: [{ userEnteredValue: texte }] },
              format: { backgroundColor: couleur },
            },
          },
        },
      })),
    },
  });
}

function lettreColonne(index0Based: number) {
  return String.fromCharCode(65 + index0Based); // A, B, C... (largement suffisant : nos tableaux ont < 10 colonnes)
}

interface LigneStable {
  id: string;
  valeurs: (string | number)[];
}

// Écrit chaque ligne à sa position déjà connue (mise à jour en place, retrouvée via une
// colonne technique cachée contenant l'id), ou l'ajoute à la fin si elle est nouvelle —
// jamais de réordonnancement ni de suppression de ligne. Sert à synchroniser un tableau
// qu'un tiers (le comptable) peut commenter dans Google Sheets, sans jamais faire dériver
// un commentaire déjà posé sur une autre ligne que celle visée à l'origine.
async function synchroniserLignesStables(
  sheets: ReturnType<typeof google.sheets>,
  idFeuille: string,
  titre: string,
  nbColonnesVisibles: number,
  ligneEntete: number,
  lignes: LigneStable[]
) {
  const colTechnique = lettreColonne(nbColonnesVisibles); // juste après la dernière colonne visible
  const finColonneVisible = lettreColonne(nbColonnesVisibles - 1);
  const premiereLigneDonnees = ligneEntete + 1;

  const lecture = await sheets.spreadsheets.values.get({
    spreadsheetId: idFeuille,
    range: `'${titre}'!${colTechnique}${premiereLigneDonnees}:${colTechnique}5000`,
  });
  const idsExistants = lecture.data.values ?? [];
  const ligneParId = new Map<string, number>();
  idsExistants.forEach((cellule, i) => {
    if (cellule[0]) ligneParId.set(String(cellule[0]), premiereLigneDonnees + i);
  });

  let prochaineLigneLibre = premiereLigneDonnees + idsExistants.length;
  const data: { range: string; values: (string | number)[][] }[] = [];

  for (const ligne of lignes) {
    const numeroLigne = ligneParId.get(ligne.id) ?? prochaineLigneLibre++;
    data.push({ range: `'${titre}'!A${numeroLigne}:${finColonneVisible}${numeroLigne}`, values: [ligne.valeurs] });
    data.push({ range: `'${titre}'!${colTechnique}${numeroLigne}`, values: [[ligne.id]] });
  }

  if (data.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: idFeuille,
      requestBody: { valueInputOption: "RAW", data },
    });
  }
}

async function creerOnglet(
  sheets: ReturnType<typeof google.sheets>,
  idFeuille: string,
  titre: string,
  appliquerFormat?: (sheetId: number) => Promise<void>
) {
  const { data } = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: idFeuille,
    requestBody: { requests: [{ addSheet: { properties: { title: titre } } }] },
  });
  const sheetId = data.replies?.[0]?.addSheet?.properties?.sheetId;
  if (sheetId != null && appliquerFormat) await appliquerFormat(sheetId);
}

// Un même instrument peut être enseigné à plusieurs groupes (élèves et séances
// distincts) — ils partagent un seul onglet plutôt que de se disputer un onglet
// au même nom, ce qui écraserait alternativement les données de l'un et l'autre.
async function classesDuMemeCours(nom: string, type: TypeCours) {
  const classes = await db.classe.findMany({
    where: { nom, type, actif: true },
    include: {
      eleves: { where: { actif: true }, orderBy: { nom: "asc" } },
      seances: {
        where: { pointage: { isNot: null } },
        orderBy: { date: "asc" },
        include: { pointage: { include: { marques: true } } },
      },
      // Plusieurs profs peuvent enseigner la même discipline (ex. Piano) et partagent
      // donc le même onglet : le nom du prof sert à distinguer leurs blocs respectifs.
      prof: { select: { nom: true, prenom: true } },
    },
    orderBy: { creeLe: "asc" },
  });

  // Classées par jour de la semaine (champ structuré jourSemaine), pour que chaque
  // groupe forme un bloc contigu plutôt que d'entrelacer ses dates avec celles d'un
  // autre groupe — sans quoi le vendredi d'une semaine se retrouve juste après le
  // lundi d'un autre groupe dans le classeur.
  const ORDRE_JOUR_SEMAINE: Record<string, number> = {
    LUNDI: 0,
    MARDI: 1,
    MERCREDI: 2,
    JEUDI: 3,
    VENDREDI: 4,
    SAMEDI: 5,
    DIMANCHE: 6,
  };
  const ordreJour = (jourSemaine: string | null) => (jourSemaine ? ORDRE_JOUR_SEMAINE[jourSemaine] ?? 7 : 7);

  return classes.sort((a, b) => ordreJour(a.jourSemaine) - ordreJour(b.jourSemaine));
}

// Réécrit entièrement l'onglet du cours à partir de l'état actuel en base :
// simple et toujours cohérent, plutôt que de tenter une mise à jour incrémentale fragile.
// Un même onglet regroupe TOUS les groupes de la discipline (cf. classesDuMemeCours).
export async function synchroniserFeuillePresence(classeId: string) {
  const client = creerClientPresences();
  if (!client) return; // Sync Google Sheets non configurée : on ignore silencieusement.
  const { sheets, idFeuille } = client;

  const reference = await db.classe.findUnique({
    where: { id: classeId },
    select: { nom: true, type: true, emoji: true },
  });
  if (!reference) return;

  const groupe = await classesDuMemeCours(reference.nom, reference.type);
  if (groupe.length === 0) return; // Plus aucun groupe actif (dernier supprimé) : rien à réécrire.

  const existant = await ongletCoursExistant(sheets, idFeuille, reference.nom);
  const titre = existant?.titre ?? nomOnglet({ emoji: groupe[0].emoji, nom: reference.nom });
  if (!existant) {
    await creerOnglet(sheets, idFeuille, titre, (sheetId) =>
      appliquerMiseEnFormeCouleur(
        sheets,
        idFeuille,
        sheetId,
        { debut: 1, fin: 50 },
        Object.fromEntries(
          (Object.keys(COULEURS_STATUT) as StatutPresence[]).map((s) => [LIBELLES_STATUT[s], COULEURS_STATUT[s]])
        )
      )
    );
  }

  const formatDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const eleves = groupe.flatMap((c) => c.eleves);
  const plusieursGroupes = groupe.length > 1;
  const entete = [
    "Date",
    ...(plusieursGroupes ? ["Groupe"] : []),
    ...eleves.map((e) => e.nom),
  ];

  // Un bloc par groupe (classe), trié chronologiquement à l'intérieur du bloc — jamais
  // toutes les dates de tous les groupes mélangées par ordre chronologique global.
  const lignes = groupe.flatMap((c, indexGroupe) => {
    const nomProf = `${c.prof.prenom} ${c.prof.nom}`;
    const libelleJour = libelleJourCours(c);
    const libelleGroupe = libelleJour ? `${libelleJour} — ${nomProf}` : `${nomProf} (Groupe ${indexGroupe + 1})`;
    return [...c.seances]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((seance) => {
        const marquesParEleve = new Map(seance.pointage!.marques.map((m) => [m.eleveId, m.statut]));
        return [
          formatDate(seance.date),
          ...(plusieursGroupes ? [libelleGroupe] : []),
          ...eleves.map((e) => (marquesParEleve.has(e.id) ? LIBELLES_STATUT[marquesParEleve.get(e.id)!] : "")),
        ];
      });
  });

  await sheets.spreadsheets.values.clear({ spreadsheetId: idFeuille, range: `'${titre}'` });
  await sheets.spreadsheets.values.update({
    spreadsheetId: idFeuille,
    range: `'${titre}'!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [entete, ...lignes] },
  });
}

// Supprime l'onglet du cours — appelé uniquement quand plus aucun groupe de cette
// discipline n'est actif (sinon on resynchronise l'onglet partagé à la place).
export async function supprimerFeuillePresence(classe: { nom: string }) {
  const client = creerClientPresences();
  if (!client) return;
  const { sheets, idFeuille } = client;
  const existant = await ongletCoursExistant(sheets, idFeuille, classe.nom);
  if (!existant) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: idFeuille,
    requestBody: { requests: [{ deleteSheet: { sheetId: existant.id } }] },
  });
}

const TITRE_ONGLET_ABSENCES = "Absences profs";

// Un seul onglet, partagé par tous les cours, pour suivre les absences des profs
// (rattrapage à prévoir ou arrêt maladie) — réécrit en entier à chaque changement.
export async function synchroniserAbsencesProf() {
  const client = creerClientPresences();
  if (!client) return;
  const { sheets, idFeuille } = client;

  const absences = await db.absenceProf.findMany({
    include: { seance: true, classe: true, prof: true },
    orderBy: { seance: { date: "asc" } },
  });

  const idOnglet = await idOngletExistant(sheets, idFeuille, TITRE_ONGLET_ABSENCES);
  if (idOnglet === null) {
    await creerOnglet(sheets, idFeuille, TITRE_ONGLET_ABSENCES, (sheetId) =>
      appliquerMiseEnFormeCouleur(
        sheets,
        idFeuille,
        sheetId,
        { debut: 3, fin: 4 },
        Object.fromEntries(
          (Object.keys(COULEURS_TYPE_ABSENCE) as TypeAbsenceProf[]).map((t) => [
            LIBELLES_TYPE_ABSENCE[t],
            COULEURS_TYPE_ABSENCE[t],
          ])
        )
      )
    );
  }

  const formatDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const entete = ["Date séance", "Prof", "Cours", "Type", "Date de rattrapage", "Commentaire"];
  const lignes = absences.map((a) => [
    formatDate(a.seance.date),
    `${a.prof.prenom} ${a.prof.nom}`,
    `${a.classe.emoji} ${a.classe.nom}`,
    LIBELLES_TYPE_ABSENCE[a.type],
    a.dateRattrapage ? formatDate(a.dateRattrapage) : "",
    a.commentaire ?? "",
  ]);

  await sheets.spreadsheets.values.clear({ spreadsheetId: idFeuille, range: `'${TITRE_ONGLET_ABSENCES}'` });
  await sheets.spreadsheets.values.update({
    spreadsheetId: idFeuille,
    range: `'${TITRE_ONGLET_ABSENCES}'!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [entete, ...lignes] },
  });
}

// L'identité occupe toujours les lignes 1 à 14 (titre, 9 champs, blanc, 2 totaux,
// blanc) ; le tableau des trajets démarre donc en ligne 15, à position fixe.
const FRAIS_LIGNE_ENTETE = 15;

// Le comptable a un accès Éditeur au classeur pour tenir lui-même la colonne « Statut de
// paiement » (ex. « Payé le 25/11/2026 ») : tout le reste de chaque onglet est verrouillé
// pour lui (seuls le compte de service de l'appli et la propriétaire du classeur peuvent
// le modifier). Réappliqué à chaque synchronisation, donc rétabli s'il est retiré.
const MARQUEUR_VERROU = "emi4m-verrou-appli";

async function verrouillerOnglet(
  sheets: ReturnType<typeof google.sheets>,
  idFeuille: string,
  titre: string,
  options: { colonneTechnique?: number; colonneLibre?: { index: number; premiereLigne: number } }
) {
  const { data } = await sheets.spreadsheets.get({
    spreadsheetId: idFeuille,
    fields: "sheets(properties(sheetId,title),protectedRanges(protectedRangeId,description))",
  });
  const onglet = data.sheets?.find((s) => s.properties?.title === titre);
  const sheetId = onglet?.properties?.sheetId;
  if (sheetId == null) return;

  const requests: object[] = [];
  // L'identifiant technique (qui garde chaque commentaire sur la bonne ligne) n'a pas
  // à être vu : on masque sa colonne.
  if (options.colonneTechnique !== undefined) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: options.colonneTechnique, endIndex: options.colonneTechnique + 1 },
        properties: { hiddenByUser: true },
        fields: "hiddenByUser",
      },
    });
  }
  const libre = options.colonneLibre;
  const unprotectedRanges = libre
    ? [{ sheetId, startRowIndex: libre.premiereLigne - 1, startColumnIndex: libre.index, endColumnIndex: libre.index + 1 }]
    : [];
  const existant = onglet?.protectedRanges?.find((p) => p.description === MARQUEUR_VERROU);
  if (!existant) {
    requests.push({
      addProtectedRange: {
        protectedRange: {
          range: { sheetId },
          description: MARQUEUR_VERROU,
          warningOnly: false,
          unprotectedRanges,
          editors: { users: [process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!] },
        },
      },
    });
  } else {
    // Verrou déjà posé : on réaligne la zone laissée libre (ex. colonne Statut ajoutée
    // après coup sur un onglet verrouillé entièrement), sans jamais dupliquer le verrou.
    requests.push({
      updateProtectedRange: {
        protectedRange: { protectedRangeId: existant.protectedRangeId, unprotectedRanges },
        fields: "unprotectedRanges",
      },
    });
  }
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: idFeuille, requestBody: { requests } });
}

// Un onglet par prof, dans le classeur comptabilité (partagé avec le comptable).
// L'identité et les totaux sont réécrits en entier à chaque fois (formules =SUM,
// jamais commentées ligne à ligne) ; le tableau des trajets est en revanche
// synchronisé ligne par ligne à position stable (cf. synchroniserLignesStables) —
// un trajet supprimé y laisse une ligne vidée plutôt que de décaler les suivantes.
export async function synchroniserFraisProf(profId: string) {
  const client = creerClientCompta();
  if (!client) return;
  const { sheets, idFeuille } = client;

  const prof = await db.user.findUnique({
    where: { id: profId },
    include: { trajets: { orderBy: { creeLe: "asc" } }, identite: true },
  });
  if (!prof) return;

  const titre = nomOngletProf(prof);
  const idOnglet = await idOngletExistant(sheets, idFeuille, titre);
  if (idOnglet === null) {
    await creerOnglet(sheets, idFeuille, titre);
  }

  const formatDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const premiereLigneDonnees = FRAIS_LIGNE_ENTETE + 1;
  const blocIdentite = [
    ["Fiche identité", ""],
    ["Nom", prof.nom],
    ["Prénom", prof.prenom],
    ["Adresse domicile", prof.identite?.adresseDomicile ?? ""],
    ["N° permis de conduire", prof.identite?.numeroPermis ?? ""],
    ["N° carte grise", prof.identite?.numeroCarteGrise ?? ""],
    ["N° assurance auto", prof.identite?.numeroAssuranceAuto ?? ""],
    ["Immatriculation véhicule", prof.identite?.immatriculationVehicule ?? ""],
    ["Marque et modèle", prof.identite?.marqueModeleVehicule ?? ""],
    ["Puissance fiscale", prof.identite?.puissanceFiscale ?? ""],
    [],
    ["Total Km", `=SUM(D${premiereLigneDonnees}:D5000)`],
    ["Total €", `=SUM(E${premiereLigneDonnees}:E5000)`],
    [],
  ];
  await sheets.spreadsheets.values.update({
    spreadsheetId: idFeuille,
    range: `'${titre}'!A1`,
    valueInputOption: "USER_ENTERED", // pour que les =SUM(...) soient interprétées comme des formules
    requestBody: { values: blocIdentite },
  });

  const entete = ["Date", "Mission", "Trajet", "Km", "€"];
  // Colonnes A–E : écrites par l'appli ; F : identifiant technique (masqué) ; G : statut
  // de paiement, tenu par le comptable — l'appli n'en écrit que l'en-tête, jamais les lignes.
  await sheets.spreadsheets.values.update({
    spreadsheetId: idFeuille,
    range: `'${titre}'!A${FRAIS_LIGNE_ENTETE}`,
    valueInputOption: "RAW",
    requestBody: { values: [[...entete, "Identifiant (technique)", "Statut de paiement"]] },
  });

  const lignes: LigneStable[] = prof.trajets.map((t) => ({
    id: t.id,
    valeurs: t.supprimeLe
      ? [formatDate(t.date), `${libelleMission(t.typeMission, t.precisionMission)} (supprimé)`, t.trajetNom, "", ""]
      : [formatDate(t.date), libelleMission(t.typeMission, t.precisionMission), t.trajetNom, t.km, t.prix],
  }));
  await synchroniserLignesStables(sheets, idFeuille, titre, entete.length, FRAIS_LIGNE_ENTETE, lignes);

  // Récapitulatif mensuel et total de l'année scolaire pour le comptable, à droite du
  // tableau (colonnes I à M, H restant vide) : recalculé en entier à chaque fois, il ne
  // touche ni aux lignes de trajets ni à la colonne Statut de paiement.
  await sheets.spreadsheets.values.clear({ spreadsheetId: idFeuille, range: `'${titre}'!I1:M200` });
  await sheets.spreadsheets.values.update({
    spreadsheetId: idFeuille,
    range: `'${titre}'!I1`,
    valueInputOption: "RAW",
    requestBody: { values: recapMensuelFrais(prof.trajets) },
  });

  await verrouillerOnglet(sheets, idFeuille, titre, {
    colonneTechnique: entete.length,
    colonneLibre: { index: entete.length + 1, premiereLigne: FRAIS_LIGNE_ENTETE + 1 },
  });
}

const ACTIVITE_LIGNE_ENTETE = 1;

// Onglet dédié par prof (séparé de celui des frais), dans le classeur comptabilité —
// tableau à position stable comme les frais, pour les mêmes raisons.
export async function synchroniserActiviteAccessoireProf(profId: string) {
  const client = creerClientCompta();
  if (!client) return;
  const { sheets, idFeuille } = client;

  const prof = await db.user.findUnique({
    where: { id: profId },
    include: {
      activitesAccessoires: { orderBy: { creeLe: "asc" }, include: { typeEvenement: true } },
      heuresHebdoContrats: true,
    },
  });
  if (!prof) return;

  const titre = sanitiserNomOnglet(`${prof.prenom} ${prof.nom} — Activité accessoire`, "Activité accessoire");
  const idOnglet = await idOngletExistant(sheets, idFeuille, titre);
  if (idOnglet === null) {
    await creerOnglet(sheets, idFeuille, titre);
  }

  const formatDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const entete = ["Date", "Type d'événement", "Durée"];
  // Colonnes A–C : écrites par l'appli ; D : identifiant technique (masqué) ; E : statut
  // de paiement, tenu par le comptable — l'appli n'en écrit que l'en-tête, jamais les lignes.
  await sheets.spreadsheets.values.update({
    spreadsheetId: idFeuille,
    range: `'${titre}'!A${ACTIVITE_LIGNE_ENTETE}`,
    valueInputOption: "RAW",
    requestBody: { values: [[...entete, "Identifiant (technique)", "Statut de paiement"]] },
  });

  // Hors forfait : payées sans entamer le forfait (type « toujours payé » comme les
  // remplacements, ou financement exceptionnel coché par la direction).
  const activites = prof.activitesAccessoires.map((a) => ({
    ...a,
    horsForfait: a.typeEvenement.toujoursPaye || a.financementExceptionnel,
  }));
  const lignes: LigneStable[] = activites.map((a) => ({
    id: a.id,
    valeurs: a.supprimeLe
      ? [formatDate(a.date), `${a.typeEvenementNom} (supprimé)`, ""]
      : [
          formatDate(a.date),
          a.financementExceptionnel
            ? `${a.typeEvenementNom} — hors forfait (financement exceptionnel)`
            : a.horsForfait
              ? `${a.typeEvenementNom} — hors forfait`
              : a.typeEvenementNom,
          a.duree,
        ],
  }));
  await synchroniserLignesStables(sheets, idFeuille, titre, entete.length, ACTIVITE_LIGNE_ENTETE, lignes);

  // Récapitulatif mensuel et total de l'année scolaire (nombre d'activités et heures),
  // à droite du tableau (colonnes G à J, F restant vide), comme pour les frais.
  await sheets.spreadsheets.values.clear({ spreadsheetId: idFeuille, range: `'${titre}'!G1:J200` });
  await sheets.spreadsheets.values.update({
    spreadsheetId: idFeuille,
    range: `'${titre}'!G1`,
    valueInputOption: "RAW",
    requestBody: {
      values: recapMensuelActivites(
        activites,
        Object.fromEntries(prof.heuresHebdoContrats.map((c) => [c.anneeScolaire, c.minutesHebdo]))
      ),
    },
  });

  // Tout est verrouillé pour le comptable, sauf la colonne Statut de paiement (E).
  await verrouillerOnglet(sheets, idFeuille, titre, {
    colonneTechnique: entete.length,
    colonneLibre: { index: entete.length + 1, premiereLigne: ACTIVITE_LIGNE_ENTETE + 1 },
  });
}

// --- Emplois du temps ---

const LIBELLES_TYPE_CRENEAU: Record<"INDIVIDUEL" | "COLLECTIF", string> = {
  INDIVIDUEL: "Individuel",
  COLLECTIF: "Collectif",
};

const TITRE_RECAP_EDT = "Récapitulatif";

// Réécrit entièrement l'onglet du prof (classeur réservé à la direction, pas de
// commentaires tiers à préserver) puis met à jour le récapitulatif de tous les profs.
export async function synchroniserEmploiDuTempsProf(profId: string) {
  const client = creerClientEmploisDuTemps();
  if (!client) return; // Classeur pas encore configuré : on ignore silencieusement.
  const { sheets, idFeuille } = client;

  const prof = await db.user.findUnique({
    where: { id: profId },
    include: {
      creneauxAgenda: {
        // L'enum JourSemaine se trie dans son ordre de déclaration (lundi → dimanche).
        orderBy: [{ jourSemaine: "asc" }, { heureDebutMinutes: "asc" }],
        include: { lieu: true, salle: true },
      },
    },
  });
  if (!prof) return;

  const titre = nomOngletProf(prof);
  if ((await idOngletExistant(sheets, idFeuille, titre)) === null) {
    await creerOnglet(sheets, idFeuille, titre);
  }

  const creneaux = prof.creneauxAgenda;
  const total = volumeHebdoMinutes(creneaux);
  const lignes = [
    [`Emploi du temps — ${prof.prenom} ${prof.nom}`],
    ["Volume hebdomadaire", formaterDuree(total), `${heuresDecimales(total)} h`],
    ["dont cours une semaine sur deux", creneaux.filter((c) => c.uneSemaineSurDeux).length],
    [],
    ["Jour", "Début", "Fin", "Durée", "Type", "Élève / groupe", "Lieu", "Salle", "Fréquence", "Temps hebdo moyen"],
    ...creneaux.map((c) => [
      libelleJourSemaine(c.jourSemaine) ?? c.jourSemaine,
      minutesVersHeure(c.heureDebutMinutes),
      minutesVersHeure(c.heureDebutMinutes + c.dureeMinutes),
      `${c.dureeMinutes} min`,
      LIBELLES_TYPE_CRENEAU[c.type],
      c.nom,
      c.lieu?.nom ?? "",
      c.salle?.nom ?? "",
      c.uneSemaineSurDeux ? "1 semaine sur 2" : "Chaque semaine",
      formaterDuree(minutesHebdo(c)),
    ]),
  ];

  await sheets.spreadsheets.values.clear({ spreadsheetId: idFeuille, range: `'${titre}'` });
  await sheets.spreadsheets.values.update({
    spreadsheetId: idFeuille,
    range: `'${titre}'!A1`,
    valueInputOption: "RAW",
    requestBody: { values: lignes },
  });

  await synchroniserRecapEmploisDuTemps();
}

// Un onglet en tête de classeur avec le volume horaire de chaque salarié actif — y
// compris ceux qui n'ont encore rien saisi, pour voir d'un coup d'œil qui manque.
export async function synchroniserRecapEmploisDuTemps() {
  const client = creerClientEmploisDuTemps();
  if (!client) return;
  const { sheets, idFeuille } = client;

  if ((await idOngletExistant(sheets, idFeuille, TITRE_RECAP_EDT)) === null) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: idFeuille,
      requestBody: { requests: [{ addSheet: { properties: { title: TITRE_RECAP_EDT, index: 0 } } }] },
    });
  }

  const salaries = await db.user.findMany({
    where: { actif: true },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    include: { creneauxAgenda: true },
  });

  const formatDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const lignes = [
    [
      "Prof",
      "Cours individuels",
      "Cours collectifs",
      "Dont 1 semaine sur 2",
      "Volume hebdomadaire",
      "Heures (décimal)",
      "Dernier ajout",
    ],
    ...salaries.map((s) => {
      const c = s.creneauxAgenda;
      if (c.length === 0) return [`${s.prenom} ${s.nom}`, "", "", "", "Non renseigné", "", ""];
      const total = volumeHebdoMinutes(c);
      const dernier = c.reduce((max, x) => (x.creeLe > max ? x.creeLe : max), c[0].creeLe);
      return [
        `${s.prenom} ${s.nom}`,
        c.filter((x) => x.type === "INDIVIDUEL").length,
        c.filter((x) => x.type === "COLLECTIF").length,
        c.filter((x) => x.uneSemaineSurDeux).length,
        formaterDuree(total),
        heuresDecimales(total),
        formatDate(dernier),
      ];
    }),
  ];

  await sheets.spreadsheets.values.clear({ spreadsheetId: idFeuille, range: `'${TITRE_RECAP_EDT}'` });
  await sheets.spreadsheets.values.update({
    spreadsheetId: idFeuille,
    range: `'${TITRE_RECAP_EDT}'!A1`,
    valueInputOption: "RAW",
    requestBody: { values: lignes },
  });
}

// --- Onglets d'explication du classeur Comptabilité ---

// Réécrit les deux onglets d'explication (barème de déplacement, règles de l'activité
// accessoire) placés en tête du classeur, à partir des données actuelles. Appelée quand la
// direction modifie le barème ou les types d'événement « toujours payés ».
export async function synchroniserOngletsExplicatifs() {
  const client = creerClientCompta();
  if (!client) return;
  const { sheets, idFeuille } = client;

  const [typesTrajet, typesPayes] = await Promise.all([
    db.typeTrajet.findMany({ where: { actif: true } }),
    db.typeEvenementAccessoire.findMany({ where: { actif: true, toujoursPaye: true }, orderBy: { nom: "asc" } }),
  ]);
  const onglets = [
    { titre: TITRE_ONGLET_BAREME, contenu: contenuOngletBareme(typesTrajet) },
    { titre: TITRE_ONGLET_ACTIVITE, contenu: contenuOngletActivite(typesPayes.map((t) => t.nom)) },
  ];

  for (const [index, { titre, contenu }] of onglets.entries()) {
    let sheetId = await idOngletExistant(sheets, idFeuille, titre);
    if (sheetId === null) {
      const { data } = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: idFeuille,
        requestBody: { requests: [{ addSheet: { properties: { title: titre, index } } }] },
      });
      sheetId = data.replies?.[0]?.addSheet?.properties?.sheetId ?? null;
    }
    if (sheetId === null) continue;

    await sheets.spreadsheets.values.clear({ spreadsheetId: idFeuille, range: `'${titre}'` });
    await sheets.spreadsheets.values.update({
      spreadsheetId: idFeuille,
      range: `'${titre}'!A1`,
      valueInputOption: "RAW",
      requestBody: { values: contenu.lignes },
    });
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: idFeuille,
      requestBody: {
        requests: [
          // Remet tout en normal, puis met en gras les titres (leurs lignes changent si le
          // barème change de taille).
          {
            repeatCell: {
              range: { sheetId },
              cell: { userEnteredFormat: { textFormat: { bold: false } } },
              fields: "userEnteredFormat.textFormat.bold",
            },
          },
          ...contenu.titres.map((ligne) => ({
            repeatCell: {
              range: { sheetId, startRowIndex: ligne, endRowIndex: ligne + 1 },
              cell: { userEnteredFormat: { textFormat: { bold: true } } },
              fields: "userEnteredFormat.textFormat.bold",
            },
          })),
          {
            updateDimensionProperties: {
              range: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 1 },
              properties: { pixelSize: 240 },
              fields: "pixelSize",
            },
          },
        ],
      },
    });
    await verrouillerOnglet(sheets, idFeuille, titre, {});
  }
}

// --- Agenda de la saison et heures musicales ---

// Classeur « Saison » : agenda des événements et programmes des heures musicales —
// réservé à la direction (noms d'élèves), donc distinct du classeur Comptabilité.
function creerClientSaison() {
  return creerClientSheets(process.env.GOOGLE_SHEETS_SAISON_ID);
}

const formatDateLongue = (d: Date) =>
  d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

async function mettreEnGras(
  sheets: ReturnType<typeof google.sheets>,
  idFeuille: string,
  sheetId: number,
  lignes: number[]
) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: idFeuille,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId },
            cell: { userEnteredFormat: { textFormat: { bold: false } } },
            fields: "userEnteredFormat.textFormat.bold",
          },
        },
        ...lignes.map((l) => ({
          repeatCell: {
            range: { sheetId, startRowIndex: l, endRowIndex: l + 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: "userEnteredFormat.textFormat.bold",
          },
        })),
      ],
    },
  });
}

// Onglet « Agenda 2026-2027 » : les 12 mois de la saison, chaque mois suivi de ses
// événements. Réécrit en entier à chaque modification de l'agenda.
export async function synchroniserAgendaSaison(debutSaison: number) {
  const client = creerClientSaison();
  if (!client) return;
  const { sheets, idFeuille } = client;

  const evenements = await db.evenementSaison.findMany({
    where: { date: { gte: new Date(Date.UTC(debutSaison, 8, 1)), lt: new Date(Date.UTC(debutSaison + 1, 8, 1)) } },
    include: { lieu: true, _count: { select: { inscriptions: true } } },
  });

  const titre = `Agenda ${debutSaison}-${debutSaison + 1}`;
  let sheetId = await idOngletExistant(sheets, idFeuille, titre);
  if (sheetId === null) {
    const { data } = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: idFeuille,
      requestBody: { requests: [{ addSheet: { properties: { title: titre, index: 0 } } }] },
    });
    sheetId = data.replies?.[0]?.addSheet?.properties?.sheetId ?? null;
  }
  if (sheetId === null) return;

  const lignes: (string | number)[][] = [[`Agenda de la saison ${debutSaison}-${debutSaison + 1}`], []];
  const gras = [0, lignes.length];
  lignes.push(["Date", "Heure", "Type", "Événement", "Lieu", "Détails"]);
  for (const mois of grouperParMois(evenements, debutSaison)) {
    lignes.push([]);
    gras.push(lignes.length);
    lignes.push([mois.libelle]);
    if (mois.evenements.length === 0) lignes.push(["", "", "", "Aucun événement"]);
    for (const e of mois.evenements) {
      const details = [
        e.description,
        e.type === "HEURE_MUSICALE" && e.dureeMaxMinutes ? `Durée prévue : ${formaterDuree(e.dureeMaxMinutes)}` : null,
        e.type === "HEURE_MUSICALE" ? `${e._count.inscriptions} élève(s) inscrit(s)` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      lignes.push([
        formatDateLongue(e.date),
        e.heureDebutMinutes !== null ? minutesVersHeure(e.heureDebutMinutes) : "",
        libelleTypeEvenement(e.type),
        e.titre,
        libelleLieu(e.lieu?.nom, e.lieuPrecis),
        details,
      ]);
    }
  }

  await sheets.spreadsheets.values.clear({ spreadsheetId: idFeuille, range: `'${titre}'` });
  await sheets.spreadsheets.values.update({
    spreadsheetId: idFeuille,
    range: `'${titre}'!A1`,
    valueInputOption: "RAW",
    requestBody: { values: lignes },
  });
  await mettreEnGras(sheets, idFeuille, sheetId, gras);
}

// Onglet du programme d'une heure musicale (ordre de passage, programme, minutage,
// matériel), retrouvé par son identifiant et renommé si la date ou le lieu changent.
// Supprimé si l'événement n'est plus une heure musicale.
export async function synchroniserProgrammeHeureMusicale(evenementId: string) {
  const client = creerClientSaison();
  if (!client) return;
  const { sheets, idFeuille } = client;

  const evenement = await db.evenementSaison.findUnique({
    where: { id: evenementId },
    include: {
      lieu: true,
      inscriptions: { orderBy: [{ ordre: "asc" }, { creeLe: "asc" }], include: { prof: true } },
    },
  });
  if (!evenement) return;

  const { data } = await sheets.spreadsheets.get({ spreadsheetId: idFeuille, fields: "sheets(properties(sheetId,title))" });
  const existants = data.sheets?.map((s) => s.properties!) ?? [];
  const actuel = existants.find((p) => p.sheetId === evenement.ongletSheetId);

  if (evenement.type !== "HEURE_MUSICALE") {
    if (actuel) await supprimerOngletSaison(actuel.sheetId!);
    if (evenement.ongletSheetId !== null) {
      await db.evenementSaison.update({ where: { id: evenementId }, data: { ongletSheetId: null } });
    }
    return;
  }

  const jour = evenement.date.toISOString().slice(0, 10).split("-").reverse().join("-");
  const base = `HM ${jour}${evenement.lieu ? ` ${evenement.lieu.nom}` : ""}`;
  let titre = sanitiserNomOnglet(base, "Heure musicale");
  for (let n = 2; existants.some((p) => p.title === titre && p.sheetId !== actuel?.sheetId); n++) {
    titre = sanitiserNomOnglet(`${base} (${n})`, "Heure musicale");
  }

  let sheetId = actuel?.sheetId ?? null;
  if (sheetId === null) {
    const { data: cree } = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: idFeuille,
      requestBody: { requests: [{ addSheet: { properties: { title: titre } } }] },
    });
    sheetId = cree.replies?.[0]?.addSheet?.properties?.sheetId ?? null;
    if (sheetId === null) return;
    await db.evenementSaison.update({ where: { id: evenementId }, data: { ongletSheetId: sheetId } });
  } else if (actuel?.title !== titre) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: idFeuille,
      requestBody: { requests: [{ updateSheetProperties: { properties: { sheetId, title: titre }, fields: "title" } }] },
    });
  }

  const inscriptions = evenement.inscriptions;
  const total = inscriptions.reduce((s, i) => s + i.minutageSecondes, 0);
  const depassement =
    evenement.dureeMaxMinutes && total > evenement.dureeMaxMinutes * 60
      ? ` (dépasse la durée prévue de ${formaterMinutage(total - evenement.dureeMaxMinutes * 60)})`
      : "";
  const lignes: (string | number)[][] = [
    [`Heure musicale — ${evenement.titre}`],
    ["Date", formatDateLongue(evenement.date)],
    ["Heure", evenement.heureDebutMinutes !== null ? minutesVersHeure(evenement.heureDebutMinutes) : ""],
    ["Lieu", libelleLieu(evenement.lieu?.nom, evenement.lieuPrecis) || "À préciser"],
    ["Durée prévue", evenement.dureeMaxMinutes ? formaterDuree(evenement.dureeMaxMinutes) : "—"],
    ["Minutage total", `${formaterMinutage(total)}${depassement}`],
    ["Élèves inscrits", inscriptions.length],
    [],
    ["N°", "Élève", "Instrument", "Programme", "Minutage", "Matériel", "Commentaire", "Professeur"],
    ...inscriptions.map((i, n) => [
      n + 1,
      i.eleveNom,
      i.instrument,
      i.programme,
      formaterMinutage(i.minutageSecondes),
      i.materiel ?? "",
      i.commentaire ?? "",
      `${i.prof.prenom} ${i.prof.nom}`,
    ]),
  ];
  const gras = [0, 8];
  const materiel = inscriptions.filter((i) => i.materiel);
  if (materiel.length > 0) {
    lignes.push([]);
    gras.push(lignes.length);
    lignes.push(["Matériel à prévoir"]);
    for (const i of materiel) lignes.push([`${i.eleveNom} (${i.instrument})`, i.materiel ?? ""]);
  }

  await sheets.spreadsheets.values.clear({ spreadsheetId: idFeuille, range: `'${titre}'` });
  await sheets.spreadsheets.values.update({
    spreadsheetId: idFeuille,
    range: `'${titre}'!A1`,
    valueInputOption: "RAW",
    requestBody: { values: lignes },
  });
  await mettreEnGras(sheets, idFeuille, sheetId, gras);
}

// Retire l'onglet du programme d'une heure musicale supprimée (ou qui n'en est plus
// une) : il n'est que le reflet de l'appli, qui garde seule les données.
export async function supprimerOngletSaison(sheetId: number) {
  const client = creerClientSaison();
  if (!client) return;
  const { sheets, idFeuille } = client;
  const { data } = await sheets.spreadsheets.get({ spreadsheetId: idFeuille, fields: "sheets(properties(sheetId))" });
  if (!data.sheets?.some((s) => s.properties?.sheetId === sheetId)) return;
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: idFeuille, requestBody: { requests: [{ deleteSheet: { sheetId } }] } });
}

// --- Locations d'instruments ---

// Classeur « Locations instruments » : un onglet « Locations » et un onglet « En attente »
// par saison, la saison la plus récente en premier. Réservé à la direction (familles).
function creerClientLocations() {
  return creerClientSheets(process.env.GOOGLE_SHEETS_LOCATIONS_ID);
}

const VERT_CLAIR = { red: 0.85, green: 0.94, blue: 0.86 };
const ROUGE_CLAIR = { red: 0.98, green: 0.87, blue: 0.86 };
const GRIS_ENTETE = { red: 0.17, green: 0.24, blue: 0.31 };

async function ongletLocations(sheets: ReturnType<typeof google.sheets>, idFeuille: string, titre: string, index: number) {
  const existant = await idOngletExistant(sheets, idFeuille, titre);
  if (existant !== null) return existant;
  const { data } = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: idFeuille,
    requestBody: { requests: [{ addSheet: { properties: { title: titre, index, gridProperties: { frozenRowCount: 3 } } } }] },
  });
  return data.replies?.[0]?.addSheet?.properties?.sheetId ?? null;
}

// Réécrit les deux onglets d'une saison à partir de l'appli (seule source de vérité).
export async function synchroniserLocations(anneeDebut: number) {
  const client = creerClientLocations();
  if (!client) return;
  const { sheets, idFeuille } = client;
  const saison = libelleSaison(anneeDebut);

  const [locations, demandes] = await Promise.all([
    db.locationInstrument.findMany({
      where: { anneeDebut },
      include: { _count: { select: { documents: true } } },
      orderBy: [{ instrument: "asc" }, { nom: "asc" }, { prenom: "asc" }],
    }),
    db.demandeLocation.findMany({ where: { anneeDebut }, orderBy: [{ instrument: "asc" }, { nom: "asc" }] }),
  ]);

  // --- Onglet Locations ---
  const titreLoc = `Locations ${saison}`;
  const idLoc = await ongletLocations(sheets, idFeuille, titreLoc, 0);
  if (idLoc === null) return;
  const entete = ["Instrument", "Prénom", "Nom", "Année loc.", "Nb de mois", "Payé", "Paiement", "Commentaire", "Documents"];
  const lignes: (string | number)[][] = [
    [`Suivi des locations d'instruments · ${saison}`],
    ["École Musicale Itinérante des 4 Montagnes"],
    entete,
    ...locations.map((l) => [
      celluleTexte(l.instrument),
      celluleTexte(l.prenom),
      celluleTexte(l.nom),
      libelleAnneeLocation(l.anneeLocation),
      l.nbMois ?? "",
      l.paye ? "Oui" : "Non",
      libelleModePaiement(l.modePaiement),
      celluleTexte(l.commentaire),
      l.dossierDriveUrl && l._count.documents > 0
        ? `=HYPERLINK("${l.dossierDriveUrl.replace(/"/g, "")}";"${l._count.documents} document${l._count.documents > 1 ? "s" : ""}")`
        : "",
    ]),
  ];
  const payees = locations.filter((l) => l.paye).length;
  lignes.push([], [`Total : ${locations.length} location${locations.length > 1 ? "s" : ""} · payées : ${payees} · non payées : ${locations.length - payees}`]);

  await sheets.spreadsheets.values.clear({ spreadsheetId: idFeuille, range: `'${titreLoc}'` });
  await sheets.spreadsheets.values.update({
    spreadsheetId: idFeuille,
    range: `'${titreLoc}'!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: lignes },
  });

  const blanc = { red: 1, green: 1, blue: 1 };
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: idFeuille,
    requestBody: {
      requests: [
        // Remise à zéro de la mise en forme, puis titre, en-tête et colonne « Payé » colorée.
        { repeatCell: { range: { sheetId: idLoc }, cell: { userEnteredFormat: {} }, fields: "userEnteredFormat" } },
        {
          repeatCell: {
            range: { sheetId: idLoc, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 14 } } },
            fields: "userEnteredFormat.textFormat",
          },
        },
        {
          repeatCell: {
            range: { sheetId: idLoc, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: entete.length },
            cell: {
              userEnteredFormat: {
                backgroundColor: GRIS_ENTETE,
                textFormat: { bold: true, foregroundColor: blanc },
              },
            },
            fields: "userEnteredFormat(backgroundColor,textFormat)",
          },
        },
        ...locations.map((l, i) => ({
          repeatCell: {
            range: { sheetId: idLoc, startRowIndex: 3 + i, endRowIndex: 4 + i, startColumnIndex: 5, endColumnIndex: 6 },
            cell: { userEnteredFormat: { backgroundColor: l.paye ? VERT_CLAIR : ROUGE_CLAIR, horizontalAlignment: "CENTER" } },
            fields: "userEnteredFormat(backgroundColor,horizontalAlignment)",
          },
        })),
        {
          repeatCell: {
            range: { sheetId: idLoc, startRowIndex: lignes.length - 1, endRowIndex: lignes.length },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: "userEnteredFormat.textFormat",
          },
        },
        { updateSheetProperties: { properties: { sheetId: idLoc, gridProperties: { frozenRowCount: 3 } }, fields: "gridProperties.frozenRowCount" } },
        { autoResizeDimensions: { dimensions: { sheetId: idLoc, dimension: "COLUMNS", startIndex: 0, endIndex: entete.length } } },
      ],
    },
  });
  await verrouillerOnglet(sheets, idFeuille, titreLoc, {});

  // --- Onglet En attente ---
  const titreAtt = `En attente ${saison}`;
  const idAtt = await ongletLocations(sheets, idFeuille, titreAtt, 1);
  if (idAtt === null) return;
  const enteteAtt = ["Instrument souhaité", "Prénom", "Nom", "Commentaire", "Demandé le"];
  const lignesAtt: (string | number)[][] = [
    [`Demandes en attente · ${saison}`],
    ["École Musicale Itinérante des 4 Montagnes"],
    enteteAtt,
    ...demandes.map((d) => [
      celluleTexte(d.instrument),
      celluleTexte(d.prenom),
      celluleTexte(d.nom),
      celluleTexte(d.commentaire),
      d.creeLe.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }),
    ]),
  ];
  await sheets.spreadsheets.values.clear({ spreadsheetId: idFeuille, range: `'${titreAtt}'` });
  await sheets.spreadsheets.values.update({
    spreadsheetId: idFeuille,
    range: `'${titreAtt}'!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: lignesAtt },
  });
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: idFeuille,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId: idAtt, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 14 } } },
            fields: "userEnteredFormat.textFormat",
          },
        },
        {
          repeatCell: {
            range: { sheetId: idAtt, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: enteteAtt.length },
            cell: { userEnteredFormat: { backgroundColor: GRIS_ENTETE, textFormat: { bold: true, foregroundColor: blanc } } },
            fields: "userEnteredFormat(backgroundColor,textFormat)",
          },
        },
        { autoResizeDimensions: { dimensions: { sheetId: idAtt, dimension: "COLUMNS", startIndex: 0, endIndex: enteteAtt.length } } },
      ],
    },
  });
  await verrouillerOnglet(sheets, idFeuille, titreAtt, {});
}
