import { google } from "googleapis";
import { Readable } from "stream";
import { db } from "@/lib/db";
import type { TypeDocument } from "@/generated/prisma/client";
import { envoyerMailConnexionDriveInterrompue, type MotifAlerteDrive } from "@/lib/mail";

// Un compte de service n'a pas de quota de stockage Drive : il peut modifier des
// fichiers existants (d'où la sync Sheets qui fonctionne) mais pas y déposer de
// nouveaux fichiers binaires. On utilise donc ici un vrai compte Google, connecté
// une fois via OAuth par un admin (cf. /admin/parametres/google-drive), dont le
// jeton de rafraîchissement est stocké en base.
async function creerClientDrive() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const dossierParentId = process.env.GOOGLE_DRIVE_DOCUMENTS_FOLDER_ID;
  if (!clientId || !clientSecret || !dossierParentId) return null;

  const config = await db.configGoogle.findUnique({ where: { id: "singleton" } });
  if (!config) return null;

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: config.refreshToken });

  return { drive: google.drive({ version: "v3", auth }), dossierParentId };
}

export type EtatConnexionDrive =
  | { statut: "non_configure" }
  | { statut: "non_connecte" }
  | { statut: "expiree"; compteEmail: string | null; majLe: Date }
  | { statut: "indisponible"; compteEmail: string | null; majLe: Date }
  | { statut: "active"; compteEmail: string | null; majLe: Date; dossierAccessible: boolean };

export function estJetonRevoqueOuExpire(erreur: unknown) {
  const e = erreur as { message?: string; response?: { data?: { error?: string } } };
  return e?.response?.data?.error === "invalid_grant" || e?.message === "invalid_grant";
}

// Teste réellement la connexion (renouvellement du jeton + accès au dossier des
// documents) pour l'afficher à l'admin : un jeton expiré ou révoqué ne se voit
// autrement que par un prof dont l'envoi de document échoue.
export async function verifierConnexionDrive(): Promise<EtatConnexionDrive> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const dossierParentId = process.env.GOOGLE_DRIVE_DOCUMENTS_FOLDER_ID;
  if (!clientId || !clientSecret || !dossierParentId) return { statut: "non_configure" };

  const config = await db.configGoogle.findUnique({ where: { id: "singleton" } });
  if (!config) return { statut: "non_connecte" };

  const { compteEmail, majLe } = config;
  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: config.refreshToken });

  try {
    await auth.getAccessToken();
  } catch (erreur) {
    if (estJetonRevoqueOuExpire(erreur)) return { statut: "expiree", compteEmail, majLe };
    console.error("Vérification de la connexion Drive impossible :", erreur);
    return { statut: "indisponible", compteEmail, majLe };
  }

  try {
    const drive = google.drive({ version: "v3", auth });
    await drive.files.get({ fileId: dossierParentId, fields: "id" });
    return { statut: "active", compteEmail, majLe, dossierAccessible: true };
  } catch (erreur) {
    console.error("Dossier des documents inaccessible :", erreur);
    return { statut: "active", compteEmail, majLe, dossierAccessible: false };
  }
}

const DELAI_RAPPEL_ALERTE_MS = 3 * 24 * 60 * 60 * 1000;

// Prévient la direction par mail : une fois, puis un rappel tous les 3 jours si le
// problème persiste (et pas à chaque vérification ou envoi raté d'un prof).
export async function alerterConnexionDriveInterrompue(motif: MotifAlerteDrive, urlAdmin: string) {
  const config = await db.configGoogle.findUnique({ where: { id: "singleton" } });
  if (!config) return false;

  const derniere = config.alerteEnvoyeeLe?.getTime();
  if (derniere && Date.now() - derniere < DELAI_RAPPEL_ALERTE_MS) return false;

  await envoyerMailConnexionDriveInterrompue({ motif, urlAdmin });
  await db.configGoogle.update({ where: { id: "singleton" }, data: { alerteEnvoyeeLe: new Date() } });
  return true;
}

// Vérification périodique (cron) : alerte si la connexion est coupée, et réarme
// l'alerte dès qu'elle est de nouveau saine.
export async function surveillerConnexionDrive(urlAdmin: string) {
  const etat = await verifierConnexionDrive();

  if (etat.statut === "expiree") {
    await alerterConnexionDriveInterrompue("expiree", urlAdmin);
  } else if (etat.statut === "active" && !etat.dossierAccessible) {
    await alerterConnexionDriveInterrompue("dossier_introuvable", urlAdmin);
  } else if (etat.statut === "active") {
    await db.configGoogle.updateMany({ where: { id: "singleton" }, data: { alerteEnvoyeeLe: null } });
  }

  return etat;
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
  const client = await creerClientDrive();
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

  const client = await creerClientDrive();
  if (client) {
    try {
      await client.drive.files.delete({ fileId: document.driveFileId });
    } catch (erreur) {
      console.error("Suppression du document Drive impossible :", erreur);
    }
  }

  await db.documentProf.delete({ where: { profId_type: { profId, type } } });
}
