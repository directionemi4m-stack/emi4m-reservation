import { google } from "googleapis";
import { db } from "@/lib/db";
import type { StatutPresence } from "@/generated/prisma/client";

const LIBELLES_STATUT: Record<StatutPresence, string> = {
  PRESENT: "Présent",
  ABSENT: "Absent",
  EXCUSE: "Excusé",
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
function nomOnglet(classe: { emoji: string; nom: string }) {
  const brut = `${classe.emoji} ${classe.nom}`.replace(/[[\]*?/\\:]/g, " ").trim();
  return brut.slice(0, 100) || "Cours";
}

async function idOngletExistant(sheets: ReturnType<typeof google.sheets>, idFeuille: string, titre: string) {
  const { data } = await sheets.spreadsheets.get({ spreadsheetId: idFeuille });
  return data.sheets?.find((s) => s.properties?.title === titre)?.properties?.sheetId ?? null;
}

async function creerOnglet(sheets: ReturnType<typeof google.sheets>, idFeuille: string, titre: string) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: idFeuille,
    requestBody: { requests: [{ addSheet: { properties: { title: titre } } }] },
  });
}

// Réécrit entièrement l'onglet du cours à partir de l'état actuel en base :
// simple et toujours cohérent, plutôt que de tenter une mise à jour incrémentale fragile.
export async function synchroniserFeuillePresence(classeId: string) {
  const client = creerClientSheets();
  if (!client) return; // Sync Google Sheets non configurée : on ignore silencieusement.
  const { sheets, idFeuille } = client;

  const classe = await db.classe.findUnique({
    where: { id: classeId },
    include: {
      eleves: { where: { actif: true }, orderBy: { nom: "asc" } },
      seances: {
        where: { pointage: { isNot: null } },
        orderBy: { date: "asc" },
        include: { pointage: { include: { marques: true } } },
      },
    },
  });
  if (!classe) return;

  const titre = nomOnglet(classe);
  const idOnglet = await idOngletExistant(sheets, idFeuille, titre);
  if (idOnglet === null) {
    await creerOnglet(sheets, idFeuille, titre);
  }

  const entete = ["Date", ...classe.eleves.map((e) => e.nom)];
  const lignes = classe.seances.map((seance) => {
    const dateFormatee = seance.date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const marquesParEleve = new Map(seance.pointage!.marques.map((m) => [m.eleveId, m.statut]));
    return [
      dateFormatee,
      ...classe.eleves.map((e) => (marquesParEleve.has(e.id) ? LIBELLES_STATUT[marquesParEleve.get(e.id)!] : "")),
    ];
  });

  await sheets.spreadsheets.values.clear({ spreadsheetId: idFeuille, range: `'${titre}'` });
  await sheets.spreadsheets.values.update({
    spreadsheetId: idFeuille,
    range: `'${titre}'!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [entete, ...lignes] },
  });
}
