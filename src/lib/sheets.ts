import { google } from "googleapis";
import { db } from "@/lib/db";
import type { StatutPresence, TypeAbsenceProf, TypeCours } from "@/generated/prisma/client";
import { libelleMission } from "@/lib/mission";
import { libelleJourCours, libelleJourSemaine } from "@/lib/joursSemaine";
import { formaterDuree, heuresDecimales, minutesHebdo, minutesVersHeure, volumeHebdoMinutes } from "@/lib/agenda";

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
  await sheets.spreadsheets.values.update({
    spreadsheetId: idFeuille,
    range: `'${titre}'!A${FRAIS_LIGNE_ENTETE}`,
    valueInputOption: "RAW",
    requestBody: { values: [entete] },
  });

  const lignes: LigneStable[] = prof.trajets.map((t) => ({
    id: t.id,
    valeurs: t.supprimeLe
      ? [formatDate(t.date), `${libelleMission(t.typeMission, t.precisionMission)} (supprimé)`, t.trajetNom, "", ""]
      : [formatDate(t.date), libelleMission(t.typeMission, t.precisionMission), t.trajetNom, t.km, t.prix],
  }));
  await synchroniserLignesStables(sheets, idFeuille, titre, entete.length, FRAIS_LIGNE_ENTETE, lignes);
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
    include: { activitesAccessoires: { orderBy: { creeLe: "asc" } } },
  });
  if (!prof) return;

  const titre = sanitiserNomOnglet(`${prof.prenom} ${prof.nom} — Activité accessoire`, "Activité accessoire");
  const idOnglet = await idOngletExistant(sheets, idFeuille, titre);
  if (idOnglet === null) {
    await creerOnglet(sheets, idFeuille, titre);
  }

  const formatDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const entete = ["Date", "Type d'événement", "Durée"];
  await sheets.spreadsheets.values.update({
    spreadsheetId: idFeuille,
    range: `'${titre}'!A${ACTIVITE_LIGNE_ENTETE}`,
    valueInputOption: "RAW",
    requestBody: { values: [entete] },
  });

  const lignes: LigneStable[] = prof.activitesAccessoires.map((a) => ({
    id: a.id,
    valeurs: a.supprimeLe
      ? [formatDate(a.date), `${a.typeEvenementNom} (supprimé)`, ""]
      : [formatDate(a.date), a.typeEvenementNom, a.duree],
  }));
  await synchroniserLignesStables(sheets, idFeuille, titre, entete.length, ACTIVITE_LIGNE_ENTETE, lignes);
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
        include: { lieu: true },
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
    ["Jour", "Début", "Fin", "Durée", "Type", "Élève / groupe", "Lieu", "Fréquence", "Temps hebdo moyen"],
    ...creneaux.map((c) => [
      libelleJourSemaine(c.jourSemaine) ?? c.jourSemaine,
      minutesVersHeure(c.heureDebutMinutes),
      minutesVersHeure(c.heureDebutMinutes + c.dureeMinutes),
      `${c.dureeMinutes} min`,
      LIBELLES_TYPE_CRENEAU[c.type],
      c.nom,
      c.lieu?.nom ?? "",
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
