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

  return { drive: google.drive({ version: "v3", auth }), auth, dossierParentId };
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

// --- Suivi CHAM : fiches d'autorisation scannées ---

const NOM_DOSSIER_CHAM = "Suivi CHAM";

// Le dossier est créé par l'appli : c'est ce qui le lui rend visible (son accès au Drive
// se limite aux fichiers qu'elle crée). Retrouvé par son nom où que la direction l'ait
// rangé ensuite ; recréé à la racine du Drive s'il a été supprimé.
async function dossierSuiviChamId(drive: ReturnType<typeof google.drive>) {
  const { data } = await drive.files.list({
    q: `name = '${NOM_DOSSIER_CHAM}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id)",
  });
  if (data.files && data.files.length > 0) return data.files[0].id!;
  const { data: dossier } = await drive.files.create({
    requestBody: { name: NOM_DOSSIER_CHAM, mimeType: "application/vnd.google-apps.folder" },
    fields: "id",
  });
  return dossier.id!;
}

// Une seule fiche par élève (elle couvre les deux autorisations) : une nouvelle fiche
// remplace la précédente.
export async function televerserDocumentCham(eleveId: string, buffer: Buffer, mimeType: string, extension: string) {
  const client = await creerClientDrive();
  if (!client) return null;
  const { drive } = client;

  const eleve = await db.eleveCham.findUnique({ where: { id: eleveId } });
  if (!eleve) return null;

  const dossierId = await dossierSuiviChamId(drive);
  if (eleve.documentDriveId) {
    try {
      await drive.files.delete({ fileId: eleve.documentDriveId });
    } catch (erreur) {
      console.error("Suppression de l'ancienne fiche CHAM impossible :", erreur);
    }
  }

  const nomFichier = `${eleve.nom.toUpperCase()} ${eleve.prenom} — autorisations CHAM${extension}`;
  const { data: fichier } = await drive.files.create({
    requestBody: { name: nomFichier, parents: [dossierId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: "id, webViewLink",
  });

  return db.eleveCham.update({
    where: { id: eleveId },
    data: {
      documentDriveId: fichier.id!,
      documentUrl: fichier.webViewLink ?? "",
      documentNom: nomFichier,
      documentMajLe: new Date(),
    },
  });
}

export async function supprimerDocumentCham(eleveId: string) {
  const eleve = await db.eleveCham.findUnique({ where: { id: eleveId } });
  if (!eleve?.documentDriveId) return;

  const client = await creerClientDrive();
  if (client) {
    try {
      await client.drive.files.delete({ fileId: eleve.documentDriveId });
    } catch (erreur) {
      console.error("Suppression de la fiche CHAM impossible :", erreur);
    }
  }
  await db.eleveCham.update({
    where: { id: eleveId },
    data: { documentDriveId: null, documentUrl: null, documentNom: null, documentMajLe: null },
  });
}

// --- Bulletins CHAM compilés ---

// « Suivi CHAM / Bulletins 2026-2027 / 1er trimestre / MARTIN Léa — bulletin CHAM.pdf ».
// Le même fichier est remplacé à chaque nouvelle signature (son lien reste stable) ; s'il a
// été supprimé à la main dans le Drive, il est recréé.
export async function deposerBulletinCham(params: {
  dossiers: string[];
  nomFichier: string;
  pdf: Uint8Array;
  fichierExistantId: string | null;
}): Promise<{ id: string; url: string } | null> {
  const client = await creerClientDrive();
  if (!client) return null;
  const { drive } = client;
  const media = { mimeType: "application/pdf", body: Readable.from(Buffer.from(params.pdf)) };

  if (params.fichierExistantId) {
    try {
      const { data } = await drive.files.update({
        fileId: params.fichierExistantId,
        requestBody: { name: params.nomFichier },
        media,
        fields: "id, webViewLink, trashed",
      });
      if (!data.trashed) return { id: data.id!, url: data.webViewLink ?? "" };
    } catch (erreur) {
      console.error("Bulletin CHAM introuvable dans le Drive, recréation :", erreur);
    }
  }

  let parentId = await dossierSuiviChamId(drive);
  for (const nom of params.dossiers) parentId = await dossierProfId(drive, parentId, nom);

  const { data: fichier } = await drive.files.create({
    requestBody: { name: params.nomFichier, parents: [parentId] },
    media: { mimeType: "application/pdf", body: Readable.from(Buffer.from(params.pdf)) },
    fields: "id, webViewLink",
  });
  return { id: fichier.id!, url: fichier.webViewLink ?? "" };
}

// --- Locations d'instruments : archive des documents rendus par les familles ---

const NOM_DOSSIER_LOCATIONS = "Locations instruments";

// Dossier racine « Locations instruments », créé par l'appli et retrouvé par son nom où que
// la direction l'ait rangé ensuite (même principe que « Suivi CHAM »).
async function dossierLocationsId(drive: ReturnType<typeof google.drive>) {
  const { data } = await drive.files.list({
    q: `name = '${NOM_DOSSIER_LOCATIONS}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id)",
  });
  if (data.files && data.files.length > 0) return data.files[0].id!;
  const { data: dossier } = await drive.files.create({
    requestBody: { name: NOM_DOSSIER_LOCATIONS, mimeType: "application/vnd.google-apps.folder" },
    fields: "id",
  });
  return dossier.id!;
}

// Un sous-dossier par location : « Locations instruments / 2026-2027 / BLANCHARD Avril — Flûte ».
// Créé au premier document et mémorisé sur la location ; recréé s'il a disparu.
async function dossierDeLocation(drive: ReturnType<typeof google.drive>, locationId: string) {
  const location = await db.locationInstrument.findUnique({ where: { id: locationId } });
  if (!location) return null;

  if (location.dossierDriveId) {
    try {
      const { data } = await drive.files.get({ fileId: location.dossierDriveId, fields: "id, trashed" });
      if (!data.trashed) return location.dossierDriveId;
    } catch {
      // dossier supprimé : on le recrée ci-dessous
    }
  }

  const racine = await dossierLocationsId(drive);
  const saison = await dossierProfId(drive, racine, `${location.anneeDebut}-${location.anneeDebut + 1}`);
  const nom = `${location.nom.toUpperCase()} ${location.prenom} — ${location.instrument}`.replace(/[\\/]/g, "-");
  const dossierId = await dossierProfId(drive, saison, nom);
  const { data } = await drive.files.get({ fileId: dossierId, fields: "webViewLink" });
  await db.locationInstrument.update({
    where: { id: locationId },
    data: { dossierDriveId: dossierId, dossierDriveUrl: data.webViewLink ?? null },
  });
  return dossierId;
}

export async function deposerDocumentLocation(params: {
  locationId: string;
  nomFichier: string;
  mimeType: string;
  contenu: Buffer;
}): Promise<{ id: string; url: string } | null> {
  const client = await creerClientDrive();
  if (!client) return null;
  const { drive } = client;

  const dossierId = await dossierDeLocation(drive, params.locationId);
  if (!dossierId) return null;
  const { data } = await drive.files.create({
    requestBody: { name: params.nomFichier, parents: [dossierId] },
    media: { mimeType: params.mimeType, body: Readable.from(params.contenu) },
    fields: "id, webViewLink",
  });
  return { id: data.id!, url: data.webViewLink ?? "" };
}

// Retrait d'un document : il part dans la corbeille du Drive (récupérable 30 jours), jamais
// supprimé définitivement.
export async function mettreALaCorbeilleDrive(fileId: string) {
  const client = await creerClientDrive();
  if (!client) return;
  await client.drive.files.update({ fileId, requestBody: { trashed: true } });
}

// --- Inventaire du matériel : photos des biens ---

const NOM_DOSSIER_INVENTAIRE = "Inventaire matériel";

// « Inventaire matériel / N°12 — PIANO B.BERTHET / photo.jpg » ; le dossier racine est
// retrouvé par son nom où que la direction l'ait rangé, le sous-dossier est mémorisé.
async function dossierDArticle(drive: ReturnType<typeof google.drive>, articleId: string, nomDossier: string) {
  const article = await db.articleInventaire.findUnique({ where: { id: articleId } });
  if (!article) return null;
  if (article.dossierDriveId) {
    try {
      const { data } = await drive.files.get({ fileId: article.dossierDriveId, fields: "id, trashed" });
      if (!data.trashed) return article.dossierDriveId;
    } catch {
      // dossier supprimé : on le recrée ci-dessous
    }
  }
  const { data: racines } = await drive.files.list({
    q: `name = '${NOM_DOSSIER_INVENTAIRE}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id)",
  });
  const racine =
    racines.files?.[0]?.id ??
    (
      await drive.files.create({
        requestBody: { name: NOM_DOSSIER_INVENTAIRE, mimeType: "application/vnd.google-apps.folder" },
        fields: "id",
      })
    ).data.id!;
  const dossierId = await dossierProfId(drive, racine, nomDossier);
  const { data } = await drive.files.get({ fileId: dossierId, fields: "webViewLink" });
  await db.articleInventaire.update({
    where: { id: articleId },
    data: { dossierDriveId: dossierId, dossierDriveUrl: data.webViewLink ?? null },
  });
  return dossierId;
}

export async function deposerPhotoInventaire(params: {
  articleId: string;
  nomDossier: string;
  nomFichier: string;
  jpeg: Buffer;
}): Promise<{ id: string; url: string } | null> {
  const client = await creerClientDrive();
  if (!client) return null;
  const { drive } = client;
  const dossierId = await dossierDArticle(drive, params.articleId, params.nomDossier);
  if (!dossierId) return null;
  const { data } = await drive.files.create({
    requestBody: { name: params.nomFichier, parents: [dossierId] },
    media: { mimeType: "image/jpeg", body: Readable.from(params.jpeg) },
    fields: "id, webViewLink",
  });
  return { id: data.id!, url: data.webViewLink ?? "" };
}

// --- Factures d'achat ---

const NOM_DOSSIER_FACTURES = "Factures achats";

// « Factures achats / 2026 / 2026-10-28_Thomann.pdf » : le dossier racine est retrouvé par son
// nom où que la direction l'ait rangé.
export async function deposerFacture(params: { annee: number; nomFichier: string; pdf: Buffer }) {
  const client = await creerClientDrive();
  if (!client) return null;
  const { drive } = client;
  const { data: racines } = await drive.files.list({
    q: `name = '${NOM_DOSSIER_FACTURES}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id)",
  });
  const racine =
    racines.files?.[0]?.id ??
    (
      await drive.files.create({
        requestBody: { name: NOM_DOSSIER_FACTURES, mimeType: "application/vnd.google-apps.folder" },
        fields: "id",
      })
    ).data.id!;
  const dossierAnnee = await dossierProfId(drive, racine, String(params.annee));
  const { data } = await drive.files.create({
    requestBody: { name: params.nomFichier, parents: [dossierAnnee] },
    media: { mimeType: "application/pdf", body: Readable.from(params.pdf) },
    fields: "id, webViewLink",
  });
  return { id: data.id!, url: data.webViewLink ?? "" };
}

export async function renommerFichierDrive(fileId: string, nom: string) {
  const client = await creerClientDrive();
  if (!client) return;
  await client.drive.files.update({ fileId, requestBody: { name: nom } });
}

// --- Clés et badges : registre signé ---

const NOM_DOSSIER_CLES = "Clés et badges";

// « Clés et badges / Registre clés et badges 2026-2027.pdf », remplacé sur place à chaque
// signature (lien stable) ; recréé s'il a été supprimé à la main.
export async function deposerRegistreCles(params: { nomFichier: string; pdf: Uint8Array; fichierExistantId: string | null }) {
  const client = await creerClientDrive();
  if (!client) return null;
  const { drive } = client;

  if (params.fichierExistantId) {
    try {
      const { data } = await drive.files.update({
        fileId: params.fichierExistantId,
        requestBody: { name: params.nomFichier },
        media: { mimeType: "application/pdf", body: Readable.from(Buffer.from(params.pdf)) },
        fields: "id, webViewLink, trashed",
      });
      if (!data.trashed) return { id: data.id!, url: data.webViewLink ?? "" };
    } catch (erreur) {
      console.error("Registre des clés introuvable dans le Drive, recréation :", erreur);
    }
  }

  const { data: racines } = await drive.files.list({
    q: `name = '${NOM_DOSSIER_CLES}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id)",
  });
  const racine =
    racines.files?.[0]?.id ??
    (
      await drive.files.create({
        requestBody: { name: NOM_DOSSIER_CLES, mimeType: "application/vnd.google-apps.folder" },
        fields: "id",
      })
    ).data.id!;
  const { data } = await drive.files.create({
    requestBody: { name: params.nomFichier, parents: [racine] },
    media: { mimeType: "application/pdf", body: Readable.from(Buffer.from(params.pdf)) },
    fields: "id, webViewLink",
  });
  return { id: data.id!, url: data.webViewLink ?? "" };
}

// --- Documents à lire et signer ---

const NOM_DOSSIER_SIGNATURES = "Documents signés";

// « Documents signés / Procédure d'évacuation / RIVAL Jeanne - … v1 signé.pdf », dans le Drive
// de la direction (non partagé). Un fichier existant (le registre) est remplacé sur place.
export async function deposerDocumentSigne(params: {
  dossier: string;
  nomFichier: string;
  pdf: Uint8Array;
  fichierExistantId?: string | null;
}) {
  const client = await creerClientDrive();
  if (!client) return null;
  const { drive } = client;
  const media = () => ({ mimeType: "application/pdf", body: Readable.from(Buffer.from(params.pdf)) });

  if (params.fichierExistantId) {
    try {
      const { data } = await drive.files.update({
        fileId: params.fichierExistantId,
        requestBody: { name: params.nomFichier },
        media: media(),
        fields: "id, webViewLink, trashed",
      });
      if (!data.trashed) return { id: data.id!, url: data.webViewLink ?? "" };
    } catch (erreur) {
      console.error("Fichier signé introuvable dans le Drive, recréation :", erreur);
    }
  }

  const { data: racines } = await drive.files.list({
    q: `name = '${NOM_DOSSIER_SIGNATURES}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id)",
  });
  const racine =
    racines.files?.[0]?.id ??
    (
      await drive.files.create({
        requestBody: { name: NOM_DOSSIER_SIGNATURES, mimeType: "application/vnd.google-apps.folder" },
        fields: "id",
      })
    ).data.id!;
  const dossier = await dossierProfId(drive, racine, params.dossier);
  const { data } = await drive.files.create({
    requestBody: { name: params.nomFichier, parents: [dossier] },
    media: media(),
    fields: "id, webViewLink",
  });
  return { id: data.id!, url: data.webViewLink ?? "" };
}

// --- Conventions de réservation des salles (mairies) ---

const NOM_DOSSIER_CONVENTIONS = "Conventions de réservation";
const NOM_REGISTRE_CONVENTIONS = "Registre des conventions de réservation";

async function dossierRacineParNom(drive: ReturnType<typeof google.drive>, nom: string) {
  const { data } = await drive.files.list({
    q: `name = '${nom.replace(/'/g, "\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id)",
  });
  return (
    data.files?.[0]?.id ??
    (await drive.files.create({ requestBody: { name: nom, mimeType: "application/vnd.google-apps.folder" }, fields: "id" })).data.id!
  );
}

// « Conventions de réservation / 2026-2027 / 2026-12-19 La Coupole (Villard-de-Lans) - Alice X.pdf ».
// Un nouveau scan remplace l'ancien sur place : le lien du registre ne change pas.
export async function deposerConvention(params: {
  saison: string;
  nomFichier: string;
  pdf: Buffer;
  fichierExistantId: string | null;
}): Promise<{ id: string; url: string } | null> {
  const client = await creerClientDrive();
  if (!client) return null;
  const { drive } = client;
  const media = () => ({ mimeType: "application/pdf", body: Readable.from(params.pdf) });

  if (params.fichierExistantId) {
    try {
      const { data } = await drive.files.update({
        fileId: params.fichierExistantId,
        requestBody: { name: params.nomFichier },
        media: media(),
        fields: "id, webViewLink, trashed",
      });
      if (!data.trashed) return { id: data.id!, url: data.webViewLink ?? "" };
    } catch (erreur) {
      console.error("Convention introuvable dans le Drive, nouveau dépôt :", erreur);
    }
  }

  const racine = await dossierRacineParNom(drive, NOM_DOSSIER_CONVENTIONS);
  const dossierSaison = await dossierProfId(drive, racine, params.saison);
  const { data } = await drive.files.create({
    requestBody: { name: params.nomFichier, parents: [dossierSaison] },
    media: media(),
    fields: "id, webViewLink",
  });
  return { id: data.id!, url: data.webViewLink ?? "" };
}

export interface LigneRegistreConvention {
  date: Date;
  horaire: string;
  salle: string;
  commune: string;
  prof: string;
  demandeMairieLe: Date | null;
  reponseMairieLe: Date | null;
  reservation: string;
  conventionUrl: string | null;
  commentaire: string | null;
}

// Le tableur registre, dans le dossier des conventions, entièrement réécrit à chaque
// changement. Créé (et retrouvé) avec le compte Google de la direction, comme les scans.
export async function ecrireRegistreConventions(lignes: LigneRegistreConvention[]): Promise<{ url: string } | null> {
  const client = await creerClientDrive();
  if (!client) return null;
  const { drive, auth } = client;
  const sheets = google.sheets({ version: "v4", auth });

  let registre = await db.registreConventions.findUnique({ where: { id: "singleton" } });
  if (registre) {
    try {
      const { data } = await drive.files.get({ fileId: registre.fichierId, fields: "trashed" });
      if (data.trashed) registre = null;
    } catch {
      registre = null; // supprimé à la main : on le recrée
    }
  }
  if (!registre) {
    const racine = await dossierRacineParNom(drive, NOM_DOSSIER_CONVENTIONS);
    const { data } = await drive.files.create({
      requestBody: { name: NOM_REGISTRE_CONVENTIONS, mimeType: "application/vnd.google-apps.spreadsheet", parents: [racine] },
      fields: "id, webViewLink",
    });
    registre = await db.registreConventions.upsert({
      where: { id: "singleton" },
      create: { fichierId: data.id!, url: data.webViewLink ?? "" },
      update: { fichierId: data.id!, url: data.webViewLink ?? "" },
    });
  }

  const { data: classeur } = await sheets.spreadsheets.get({ spreadsheetId: registre.fichierId, fields: "sheets(properties(sheetId))" });
  const sheetId = classeur.sheets?.[0]?.properties?.sheetId ?? 0;

  const texte = (v: string | null | undefined) => ({ userEnteredValue: { stringValue: v ?? "" } });
  const date = (d: Date | null) =>
    d ? { userEnteredValue: { numberValue: d.getTime() / 86400000 + 25569 }, userEnteredFormat: { numberFormat: { type: "DATE", pattern: "dd/mm/yyyy" } } } : texte("");
  const gras = { textFormat: { bold: true } };
  const entete = ["Date", "Horaire", "Salle", "Commune", "Prof", "Demande à la mairie", "Réponse de la mairie", "Réservation", "Convention", "Commentaire"];
  const maintenant = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

  const rows = [
    { values: [{ ...texte(NOM_REGISTRE_CONVENTIONS), userEnteredFormat: { textFormat: { bold: true, fontSize: 14 } } }] },
    { values: [texte(`École Musicale Itinérante des 4 Montagnes · mis à jour par l'appli le ${maintenant}`)] },
    {
      values: entete.map((t) => ({
        ...texte(t),
        userEnteredFormat: { backgroundColor: { red: 0.17, green: 0.24, blue: 0.31 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } },
      })),
    },
    ...lignes.map((l) => ({
      values: [
        {
          userEnteredValue: { numberValue: l.date.getTime() / 86400000 + 25569 },
          userEnteredFormat: { numberFormat: { type: "DATE", pattern: "dd/mm/yyyy" }, ...gras },
        },
        texte(l.horaire),
        texte(l.salle),
        texte(l.commune),
        texte(l.prof),
        date(l.demandeMairieLe),
        date(l.reponseMairieLe),
        texte(l.reservation),
        l.conventionUrl
          ? { ...texte("Voir la convention"), userEnteredFormat: { textFormat: { link: { uri: l.conventionUrl } } } }
          : { ...texte("Manquante"), userEnteredFormat: { textFormat: { foregroundColor: { red: 0.75, green: 0.22, blue: 0.17 } } } },
        texte(l.commentaire),
      ],
    })),
  ];
  const largeurs = [95, 95, 130, 140, 150, 140, 150, 100, 130, 260];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: registre.fichierId,
    requestBody: {
      requests: [
        { updateSheetProperties: { properties: { sheetId, title: "Conventions", gridProperties: { frozenRowCount: 3 } }, fields: "title,gridProperties.frozenRowCount" } },
        { clearBasicFilter: { sheetId } },
        { updateCells: { range: { sheetId }, fields: "*" } },
        { updateCells: { range: { sheetId, startRowIndex: 0, startColumnIndex: 0 }, rows, fields: "*" } },
        ...largeurs.map((pixelSize, i) => ({
          updateDimensionProperties: {
            range: { sheetId, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 },
            properties: { pixelSize },
            fields: "pixelSize",
          },
        })),
        {
          setBasicFilter: {
            filter: { range: { sheetId, startRowIndex: 2, endRowIndex: 3 + lignes.length, startColumnIndex: 0, endColumnIndex: entete.length } },
          },
        },
      ],
    },
  });
  return { url: registre.url };
}
