import { google } from "googleapis";
import { Readable } from "stream";
import { db } from "@/lib/db";
import type { TypeDocument } from "@/generated/prisma/client";

function creerClientDrive() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const cle = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const dossierParentId = process.env.GOOGLE_DRIVE_DOCUMENTS_FOLDER_ID;
  if (!email || !cle || !dossierParentId) return null;

  const auth = new google.auth.JWT({
    email,
    key: cle.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return { drive: google.drive({ version: "v3", auth }), dossierParentId };
}

function nomDossierProf(prof: { prenom: string; nom: string }) {
  return `${prof.prenom} ${prof.nom}`.trim() || "Prof";
}

async function dossierProfId(
  drive: ReturnType<typeof google.drive>,
  dossierParentId: string,
  nom: string
) {
  const requete = `'${dossierParentId}' in parents and name = '${nom.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const { data } = await drive.files.list({ q: requete, fields: "files(id)" });
  if (data.files && data.files.length > 0) return data.files[0].id!;

  const { data: dossier } = await drive.files.create({
    requestBody: {
      name: nom,
      mimeType: "application/vnd.google-apps.folder",
      parents: [dossierParentId],
    },
    fields: "id",
  });
  return dossier.id!;
}

const LIBELLES_DOCUMENT: Record<TypeDocument, string> = {
  PERMIS_CONDUIRE: "Permis de conduire",
  CARTE_IDENTITE: "Carte d'identité",
};

export async function televerserDocumentProf(
  profId: string,
  type: TypeDocument,
  buffer: Buffer,
  mimeType: string,
  extension: string
) {
  const client = creerClientDrive();
  if (!client) return null;
  const { drive, dossierParentId } = client;

  const prof = await db.user.findUnique({ where: { id: profId } });
  if (!prof) return null;

  const dossierId = await dossierProfId(drive, dossierParentId, nomDossierProf(prof));

  const existant = await db.documentProf.findUnique({ where: { profId_type: { profId, type } } });
  if (existant) {
    try {
      await drive.files.delete({ fileId: existant.driveFileId });
    } catch (erreur) {
      console.error("Suppression de l'ancien document Drive impossible :", erreur);
    }
  }

  const nomFichier = `${LIBELLES_DOCUMENT[type]}${extension}`;
  const { data: fichier } = await drive.files.create({
    requestBody: { name: nomFichier, parents: [dossierId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: "id, webViewLink",
  });

  return db.documentProf.upsert({
    where: { profId_type: { profId, type } },
    create: {
      profId,
      type,
      nomFichier,
      driveFileId: fichier.id!,
      driveUrl: fichier.webViewLink ?? "",
    },
    update: {
      nomFichier,
      driveFileId: fichier.id!,
      driveUrl: fichier.webViewLink ?? "",
    },
  });
}

export async function supprimerDocumentProf(profId: string, type: TypeDocument) {
  const document = await db.documentProf.findUnique({ where: { profId_type: { profId, type } } });
  if (!document) return;

  const client = creerClientDrive();
  if (client) {
    try {
      await client.drive.files.delete({ fileId: document.driveFileId });
    } catch (erreur) {
      console.error("Suppression du document Drive impossible :", erreur);
    }
  }

  await db.documentProf.delete({ where: { profId_type: { profId, type } } });
}
