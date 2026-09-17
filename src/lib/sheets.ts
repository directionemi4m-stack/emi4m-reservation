import { google } from "googleapis";
import { db } from "@/lib/db";
import type { StatutPresence, TypeAbsenceProf, TypeCours } from "@/generated/prisma/client";
import { libelleMission } from "@/lib/mission";

const LIBELLES_STATUT: Record<StatutPresence, string> = {
  PRESENT: "Présent",
  ABSENT: "Absent",
  EXCUSE: "Excusé",
};

const LIBELLES_TYPE_ABSENCE: Record<TypeAbsenceProf, string> = {
  RATTRAPAGE: "Rattrapage",
  ARRET_MALADIE: "Arrêt maladie",
};

function creerClientSheets() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const cle = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const idFeuille = process.env.GOOGLE_SHEETS_ID;
  if (!email || !cle || !idFeuille) return null;

  const auth = new google.auth.JWT({
    email,
    key: cle.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return { sheets: google.sheets({ version: "v4", auth }), idFeuille };
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
  return db.classe.findMany({
    where: { nom, type, actif: true },
    include: {
      eleves: { where: { actif: true }, orderBy: { nom: "asc" } },
      seances: {
        where: { pointage: { isNot: null } },
        orderBy: { date: "asc" },
        include: { pointage: { include: { marques: true } } },
      },
    },
    orderBy: { creeLe: "asc" },
  });
}

// Réécrit entièrement l'onglet du cours à partir de l'état actuel en base :
// simple et toujours cohérent, plutôt que de tenter une mise à jour incrémentale fragile.
// Un même onglet regroupe TOUS les groupes de la discipline (cf. classesDuMemeCours).
export async function synchroniserFeuillePresence(classeId: string) {
  const client = creerClientSheets();
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
  const entete = ["Date", ...eleves.map((e) => e.nom)];

  const lignesDatees = groupe.flatMap((c) =>
    c.seances.map((seance) => {
      const marquesParEleve = new Map(seance.pointage!.marques.map((m) => [m.eleveId, m.statut]));
      return {
        date: seance.date,
        valeurs: eleves.map((e) => (marquesParEleve.has(e.id) ? LIBELLES_STATUT[marquesParEleve.get(e.id)!] : "")),
      };
    })
  );
  lignesDatees.sort((a, b) => a.date.getTime() - b.date.getTime());
  const lignes = lignesDatees.map((l) => [formatDate(l.date), ...l.valeurs]);

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
  const client = creerClientSheets();
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
  const client = creerClientSheets();
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

// Un onglet par prof, réécrit en entier — mêmes colonnes que le fichier Excel
// existant (date, mission, trajet, km, €), avec un total en bas de tableau.
export async function synchroniserFraisProf(profId: string) {
  const client = creerClientSheets();
  if (!client) return;
  const { sheets, idFeuille } = client;

  const prof = await db.user.findUnique({
    where: { id: profId },
    include: { trajets: { orderBy: { date: "asc" } }, identite: true },
  });
  if (!prof) return;

  const titre = nomOngletProf(prof);
  const idOnglet = await idOngletExistant(sheets, idFeuille, titre);
  if (idOnglet === null) {
    await creerOnglet(sheets, idFeuille, titre);
  }

  const formatDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

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
  ];

  const entete = ["Date", "Mission", "Trajet", "Km", "€"];
  const lignes = prof.trajets.map((t) => [
    formatDate(t.date),
    libelleMission(t.typeMission, t.precisionMission),
    t.trajetNom,
    t.km,
    t.prix,
  ]);
  const totalKm = prof.trajets.reduce((s, t) => s + t.km, 0);
  const totalPrix = prof.trajets.reduce((s, t) => s + t.prix, 0);
  const ligneTotal = ["", "", "Total", totalKm, Math.round(totalPrix * 100) / 100];

  await sheets.spreadsheets.values.clear({ spreadsheetId: idFeuille, range: `'${titre}'` });
  await sheets.spreadsheets.values.update({
    spreadsheetId: idFeuille,
    range: `'${titre}'!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [...blocIdentite, entete, ...lignes, ligneTotal] },
  });
}
