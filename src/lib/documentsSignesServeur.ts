import { db } from "@/lib/db";
import { MAIL_DIRECTION, salariesDuRegistre } from "@/lib/clesServeur";
import { genererCopieSignee, genererRegistreDocument, type LigneRegistreDocument } from "@/lib/attestationPdf";
import { deposerDocumentSigne } from "@/lib/drive";
import { envoyerMailDocumentASigner } from "@/lib/mail";
import { envoyerPush } from "@/lib/push";
import { nomCopieSignee, nomDossierDocument, nomRegistre, relanceDue } from "@/lib/documentsSignes";

// Tous les salariés actifs doivent signer (le compte partagé de la direction n'est pas une
// personne et n'est pas concerné).
export function signataires() {
  return db.user.findMany({
    where: salariesDuRegistre,
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    select: { id: true, prenom: true, nom: true, email: true },
  });
}

const nomComplet = (p: { prenom: string; nom: string }) => `${p.prenom} ${p.nom}`.trim();

// Copie signée (document + attestation) d'une signature, déposée dans le Drive.
export async function deposerCopieSignee(signatureId: string): Promise<boolean> {
  const s = await db.signatureDocument.findUnique({
    where: { id: signatureId },
    include: { document: true, user: { select: { prenom: true, nom: true, email: true } } },
  });
  if (!s) return false;
  const pdf = await genererCopieSignee({
    original: s.document.pdf,
    document: { titre: s.document.titre, version: s.version, publieLe: s.document.publieLe },
    attestation: s.document.attestation,
    signataire: { nom: nomComplet(s.user), email: s.user.email },
    signeLe: s.signeLe,
    signature: s.image,
  });
  const fichier = await deposerDocumentSigne({
    dossier: nomDossierDocument(s.document.titre),
    nomFichier: nomCopieSignee({ titre: s.document.titre, version: s.version, prenom: s.user.prenom, nom: s.user.nom }),
    pdf,
    fichierExistantId: s.driveFileId,
  });
  if (!fichier) return false;
  await db.signatureDocument.update({ where: { id: s.id }, data: { driveFileId: fichier.id, url: fichier.url } });
  return true;
}

// Registre de la version en cours : tous les signataires attendus, plus ceux qui ont signé
// puis quitté l'école. Remplacé sur place dans le Drive à chaque signature.
export async function regenererRegistreDocument(documentId: string): Promise<boolean> {
  const document = await db.documentASigner.findUnique({ where: { id: documentId } });
  if (!document) return false;
  const [attendus, signatures] = await Promise.all([
    signataires(),
    db.signatureDocument.findMany({
      where: { documentId, version: document.version, user: { email: { not: MAIL_DIRECTION } } },
      include: { user: { select: { prenom: true, nom: true } } },
    }),
  ]);
  const parUser = new Map(signatures.map((s) => [s.userId, s]));
  const lignes: LigneRegistreDocument[] = attendus.map((p) => {
    const s = parUser.get(p.id);
    return { nom: nomComplet(p), signeLe: s?.signeLe ?? null, signature: s?.image ?? null };
  });
  const idsAttendus = new Set(attendus.map((p) => p.id));
  for (const s of signatures) {
    if (!idsAttendus.has(s.userId)) lignes.push({ nom: nomComplet(s.user), signeLe: s.signeLe, signature: s.image });
  }

  const pdf = await genererRegistreDocument({
    document: { titre: document.titre, version: document.version, publieLe: document.publieLe },
    lignes,
  });
  const fichier = await deposerDocumentSigne({
    dossier: nomDossierDocument(document.titre),
    nomFichier: nomRegistre(document),
    pdf,
    fichierExistantId: document.registreFileId,
  });
  if (!fichier) return false;
  await db.documentASigner.update({ where: { id: documentId }, data: { registreFileId: fichier.id, registreUrl: fichier.url } });
  return true;
}

// Rattrape ce qui n'a pas pu être déposé (Drive déconnecté au moment de la signature).
export async function mettreAJourDriveDocument(documentId: string): Promise<boolean> {
  const document = await db.documentASigner.findUnique({ where: { id: documentId }, select: { version: true } });
  if (!document) return false;
  const manquantes = await db.signatureDocument.findMany({
    where: { documentId, version: document.version, url: null },
    select: { id: true },
  });
  let ok = true;
  for (const s of manquantes) ok = (await deposerCopieSignee(s.id)) && ok;
  return (await regenererRegistreDocument(documentId)) && ok;
}

// Mail + notification : à tous pour une publication ou une nouvelle version, aux seuls
// retardataires pour la relance. Renvoie le nombre de personnes prévenues.
export async function prevenirSignataires(
  documentId: string,
  type: "PUBLICATION" | "NOUVELLE_VERSION" | "RELANCE",
  urlBase: string
): Promise<number> {
  const document = await db.documentASigner.findUnique({ where: { id: documentId } });
  if (!document) return 0;
  let profs = await signataires();
  if (type === "RELANCE") {
    const deja = await db.signatureDocument.findMany({
      where: { documentId, version: document.version },
      select: { userId: true },
    });
    const ontSigne = new Set(deja.map((s) => s.userId));
    profs = profs.filter((p) => !ontSigne.has(p.id));
  }

  let mails = 0;
  for (const prof of profs) {
    try {
      await envoyerMailDocumentASigner({ prof, titre: document.titre, type, url: `${urlBase}/securite` });
      mails++;
    } catch (erreur) {
      console.error(`Mail « document à signer » non envoyé à ${prof.email} :`, erreur);
    }
  }
  await envoyerPush(
    profs.map((p) => p.id),
    {
      titre: type === "RELANCE" ? "Rappel : document à signer" : "Document à lire et signer",
      corps: type === "RELANCE" ? `Vous n'avez pas encore signé « ${document.titre} ».` : `« ${document.titre} » est à lire et signer.`,
      url: "/securite",
    }
  );
  return mails;
}

// Passage quotidien du cron : relance, une seule fois par version, ceux qui n'ont pas signé
// une semaine après la publication.
export async function envoyerRelancesDocuments(maintenant: Date, urlBase: string) {
  const documents = await db.documentASigner.findMany({
    where: { retireLe: null, relanceLe: null },
    select: { id: true, version: true, publieLe: true },
  });
  const relances: { documentId: string; mails: number }[] = [];
  for (const d of documents) {
    if (!relanceDue(d.publieLe, maintenant)) continue;
    // Réservation avant l'envoi : deux passages simultanés ne relancent pas deux fois.
    const { count } = await db.documentASigner.updateMany({
      where: { id: d.id, version: d.version, relanceLe: null },
      data: { relanceLe: maintenant },
    });
    if (count === 0) continue;
    relances.push({ documentId: d.id, mails: await prevenirSignataires(d.id, "RELANCE", urlBase) });
  }
  return { relances };
}
