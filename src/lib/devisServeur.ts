import { db } from "@/lib/db";
import { lireCoordonnees } from "@/lib/coordonneesServeur";
import { genererDocumentPdf } from "@/lib/documentPdf";
import { deposerDocumentDevis } from "@/lib/drive";
import { nomFichierDocument } from "@/lib/devis";

const avecLignes = { lignes: { orderBy: { ordre: "asc" as const } } };
const dateLongue = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export const chargerDevis = (id: string) => db.devisEmis.findUnique({ where: { id }, include: { ...avecLignes, factures: { select: { id: true, numero: true } } } });
export const chargerFacture = (id: string) => db.factureEmise.findUnique({ where: { id }, include: { ...avecLignes, devis: { select: { id: true, numero: true, dateDevis: true } } } });

export async function pdfDevis(id: string): Promise<{ pdf: Uint8Array; nomFichier: string } | null> {
  const d = await chargerDevis(id);
  if (!d) return null;
  const pdf = await genererDocumentPdf(
    {
      type: "DEVIS",
      numero: d.numero,
      date: d.dateDevis,
      echeance: d.valableJusquAu,
      client: { nom: d.clientNom, adresse: d.clientAdresse, email: d.clientEmail },
      objet: d.objet,
      datePrestation: d.datePrestation,
      lignes: d.lignes,
      conditions: d.conditions,
      reference: null,
    },
    await lireCoordonnees()
  );
  return { pdf, nomFichier: nomFichierDocument(d.numero, d.clientNom) };
}

export async function pdfFacture(id: string): Promise<{ pdf: Uint8Array; nomFichier: string } | null> {
  const f = await chargerFacture(id);
  if (!f) return null;
  const pdf = await genererDocumentPdf(
    {
      type: "FACTURE",
      numero: f.numero,
      date: f.dateFacture,
      echeance: f.echeance,
      client: { nom: f.clientNom, adresse: f.clientAdresse, email: f.clientEmail },
      objet: f.objet,
      datePrestation: f.datePrestation,
      lignes: f.lignes,
      conditions: f.conditions,
      reference: f.devis ? `Devis ${f.devis.numero} du ${dateLongue(f.devis.dateDevis)}` : null,
    },
    await lireCoordonnees()
  );
  return { pdf, nomFichier: nomFichierDocument(f.numero, f.clientNom) };
}

// Archive (ou remplace) le PDF du devis dans « Devis émis / année ».
export async function archiverPdfDevis(id: string) {
  const d = await db.devisEmis.findUnique({ where: { id } });
  const fichier = await pdfDevis(id);
  if (!d || !fichier) return null;
  const depot = await deposerDocumentDevis({ dossier: "Devis émis", annee: d.annee, nomFichier: fichier.nomFichier, pdf: fichier.pdf, fichierExistantId: d.pdfDriveFileId });
  if (depot) await db.devisEmis.update({ where: { id }, data: { pdfDriveFileId: depot.id, pdfUrl: depot.url } });
  return { ...fichier, depot };
}

export async function archiverPdfFacture(id: string) {
  const f = await db.factureEmise.findUnique({ where: { id } });
  const fichier = await pdfFacture(id);
  if (!f || !fichier) return null;
  const depot = await deposerDocumentDevis({ dossier: "Factures émises", annee: f.annee, nomFichier: fichier.nomFichier, pdf: fichier.pdf, fichierExistantId: f.pdfDriveFileId });
  if (depot) await db.factureEmise.update({ where: { id }, data: { pdfDriveFileId: depot.id, pdfUrl: depot.url } });
  return { ...fichier, depot };
}

// Les clients déjà connus (devis et factures passés, contacts des mairies), pour remplir
// le client d'un clic.
export async function clientsConnus(): Promise<{ nom: string; adresse: string | null; email: string | null }[]> {
  const [devis, contacts] = await Promise.all([
    db.devisEmis.findMany({ orderBy: { creeLe: "desc" }, select: { clientNom: true, clientAdresse: true, clientEmail: true } }),
    db.contact.findMany({ include: { commune: true } }),
  ]);
  const vus = new Map<string, { nom: string; adresse: string | null; email: string | null }>();
  for (const d of devis) if (!vus.has(d.clientNom)) vus.set(d.clientNom, { nom: d.clientNom, adresse: d.clientAdresse, email: d.clientEmail });
  for (const c of contacts) {
    const nom = `Mairie de ${c.commune.nom}`;
    if (!vus.has(nom)) vus.set(nom, { nom, adresse: null, email: c.email });
  }
  return [...vus.values()].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}
