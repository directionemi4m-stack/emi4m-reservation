import { db } from "@/lib/db";
import { lireCoordonnees } from "@/lib/coordonneesServeur";
import { genererAttestationAchat } from "@/lib/attestationAchatPdf";

export const chargerAttestation = (id: string) =>
  db.attestationAchat.findUnique({
    where: { id },
    include: { lignes: { orderBy: { ordre: "asc" } }, facture: { include: { articles: { select: { id: true, numeroImmo: true, designation: true } } } } },
  });

// « ACH-2026-001 DUPONT Jean.pdf »
export const nomFichierAttestation = (numero: string, vendeur: string, suffixe = "") =>
  `${numero} ${vendeur.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60)}${suffixe}.pdf`;

export async function pdfAttestation(id: string): Promise<{ pdf: Uint8Array; nomFichier: string } | null> {
  const a = await chargerAttestation(id);
  if (!a) return null;
  const inventaire = a.facture?.articles.map((x) => (x.numeroImmo !== null ? `N°${x.numeroImmo}` : null)).filter(Boolean).join(", ") || null;
  const pdf = await genererAttestationAchat(
    {
      numero: a.numero,
      date: a.date,
      vendeur: { nom: a.vendeurNom, adresse: a.vendeurAdresse, telephone: a.vendeurTelephone, email: a.vendeurEmail, piece: a.vendeurPiece },
      representant: a.representant,
      qualite: a.qualite,
      faitA: a.faitA,
      lignes: a.lignes,
      paiement: { mode: a.modePaiement, reference: a.referencePaiement, banque: a.banque, date: a.datePaiement },
      dateRemise: a.dateRemise,
      suivi: { demandePar: a.demandePar, motif: a.motif, affectation: a.affectation, destination: a.destination, numeroInventaire: inventaire },
    },
    await lireCoordonnees()
  );
  return { pdf, nomFichier: nomFichierAttestation(a.numero, a.vendeurNom) };
}

// Attestation signée : la facture d'achat qui la représente (rubrique Achats) est créée une
// fois puis mise à jour ; le matériel entre à l'inventaire si demandé (première fois seulement).
export async function enregistrerSignature(
  id: string,
  depot: { id: string; url: string },
  depotPiece: { id: string; url: string } | null,
  inventaire: boolean
) {
  const a = await db.attestationAchat.findUnique({ where: { id }, include: { lignes: { orderBy: { ordre: "asc" } } } });
  if (!a) return;
  const total = a.lignes.reduce((s, l) => s + l.prixCentimes, 0);
  const objet = `Achat d'occasion ${a.numero} : ${a.lignes.map((l) => l.designation).join(", ")}`.slice(0, 200);
  const nomFacture = `${a.date.toISOString().slice(0, 10)}_${a.vendeurNom.replace(/[\\/:*?"<>|]+/g, " ").trim()} (${a.numero}).pdf`;
  await db.$transaction(async (tx) => {
    const facture = a.factureId
      ? await tx.facture.update({ where: { id: a.factureId }, data: { driveFileId: depot.id, url: depot.url, montantCentimes: total, objet } })
      : await tx.facture.create({
          data: { date: a.date, fournisseur: a.vendeurNom, montantCentimes: total, objet, nomFichier: nomFacture, driveFileId: depot.id, url: depot.url },
        });
    await tx.attestationAchat.update({
      where: { id: a.id },
      data: {
        signeLe: a.signeLe ?? new Date(),
        signeDriveFileId: depot.id,
        signeUrl: depot.url,
        ...(depotPiece ? { pieceDriveFileId: depotPiece.id } : {}),
        factureId: facture.id,
      },
    });
    if (inventaire && !a.factureId) {
      for (const l of a.lignes) {
        await tx.articleInventaire.create({
          data: {
            designation: l.designation,
            marqueModele: l.marqueModele,
            numeroSerie: l.numeroSerie,
            dateAcquisition: a.date,
            valeurCentimes: l.prixCentimes,
            localisation: a.affectation,
            remarques: `Acheté d'occasion à ${a.vendeurNom} (${a.numero})${a.destination === "LOCATION" ? " — parc de location" : ""}${l.etat ? ` — état à l'achat : ${l.etat}` : ""}`,
            factures: { connect: { id: facture.id } },
          },
        });
      }
    }
  });
}
