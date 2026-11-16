import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { copieIndependante, nettoyer } from "@/lib/bulletinPdf";
import { LOGO_EMI4M } from "@/lib/bulletinLogos";
import { decouperLignes } from "@/lib/bulletinsCham";
import { CONDITIONS_DEFAUT, MENTION_TVA_DEFAUT, MENTIONS_FACTURE_DEFAUT, euros, totalDocument, totalLigne, type Ligne } from "@/lib/devis";
import type { Coordonnees } from "@/lib/programmes";

const LARGEUR = 595.28;
const HAUTEUR = 841.89;
const MARGE = 45;
const ARDOISE = rgb(0.17, 0.24, 0.31);
const GRIS = rgb(0.45, 0.49, 0.53);
const BORD = rgb(0.8, 0.82, 0.86);
const FOND = rgb(0.93, 0.95, 0.97);
const BLANC = rgb(1, 1, 1);
// Désignation, quantité, prix unitaire, total (505 pt).
const COLONNES = [275, 70, 80, 80];

export interface DocumentAImprimer {
  type: "DEVIS" | "FACTURE";
  numero: string;
  date: Date;
  echeance: Date; // validité du devis, ou échéance de la facture
  client: { nom: string; adresse: string | null; email: string | null };
  objet: string;
  datePrestation: string | null;
  lignes: Ligne[];
  conditions: string | null;
  reference: string | null; // facture : « Devis D-2026-001 du 3 novembre 2026 »
}

const dateLongue = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const quantite = (q: number) => q.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
// « 12 heures », « 1 séance », « 120 km » (les abréviations restent invariables).
const unitePluriel = (u: string, q: number) => (q >= 2 && u.length > 3 && !/[sx]$/.test(u) ? `${u}s` : u);

// Le devis ou la facture en PDF, à l'en-tête de l'école : coordonnées, client, lignes,
// total, mentions (TVA, paiement) ; « Bon pour accord » à signer sur un devis.
export async function genererDocumentPdf(doc: DocumentAImprimer, c: Coordonnees): Promise<Uint8Array> {
  const estDevis = doc.type === "DEVIS";
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${estDevis ? "Devis" : "Facture"} ${doc.numero} — ${doc.client.nom}`);
  pdf.setAuthor(c.sigle);
  const normale = await pdf.embedFont(StandardFonts.Helvetica);
  const grasse = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedJpg(copieIndependante(Buffer.from(LOGO_EMI4M, "base64")));

  let page = pdf.addPage([LARGEUR, HAUTEUR]);
  let y = HAUTEUR - MARGE;
  const texte = (t: string, x: number, yy: number, taille: number, police: PDFFont = normale, couleur = ARDOISE, p: PDFPage = page) =>
    p.drawText(nettoyer(t, police), { x, y: yy, size: taille, font: police, color: couleur });
  const lignesDe = (t: string, largeur: number, police: PDFFont, taille: number) =>
    decouperLignes(nettoyer(t, police), largeur, (s) => police.widthOfTextAtSize(s, taille));
  const aDroite = (t: string, xDroite: number, yy: number, taille: number, police: PDFFont = normale, couleur = ARDOISE) =>
    texte(t, xDroite - police.widthOfTextAtSize(nettoyer(t, police), taille), yy, taille, police, couleur);
  const place = (h: number) => {
    if (y - h < MARGE + 30) {
      page = pdf.addPage([LARGEUR, HAUTEUR]);
      y = HAUTEUR - MARGE;
      return true;
    }
    return false;
  };

  // En-tête : l'école à gauche, le document à droite.
  page.drawImage(logo, { x: MARGE, y: y - 56, width: (logo.width * 56) / logo.height, height: 56 });
  const xEcole = MARGE + 70;
  texte(c.nom, xEcole, y - 12, 11, grasse);
  const infosEcole = [
    ...c.adresse.split(/\r?\n/).map((l) => l.trim()).filter(Boolean),
    [c.telephone && `Tél. ${c.telephone}`, c.email].filter(Boolean).join(" · "),
    c.siret ? `SIRET ${c.siret}` : "",
  ].filter(Boolean);
  infosEcole.forEach((l, i) => texte(l, xEcole, y - 26 - i * 11, 8.5, normale, GRIS));
  aDroite(estDevis ? "DEVIS" : "FACTURE", LARGEUR - MARGE, y - 16, 20, grasse);
  aDroite(`N° ${doc.numero}`, LARGEUR - MARGE, y - 32, 10, grasse);
  aDroite(`Date : ${dateLongue(doc.date)}`, LARGEUR - MARGE, y - 45, 9, normale, GRIS);
  aDroite(`${estDevis ? "Valable jusqu'au" : "Échéance"} : ${dateLongue(doc.echeance)}`, LARGEUR - MARGE, y - 57, 9, normale, GRIS);
  y -= Math.max(70, 30 + infosEcole.length * 11) + 14;

  // Client.
  const clientLignes = [doc.client.nom, ...(doc.client.adresse ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean), doc.client.email ?? ""].filter(Boolean);
  const hClient = 18 + clientLignes.length * 12;
  page.drawRectangle({ x: LARGEUR / 2, y: y - hClient, width: LARGEUR / 2 - MARGE, height: hClient, color: FOND });
  texte(estDevis ? "Client" : "Facturé à", LARGEUR / 2 + 10, y - 12, 8, normale, GRIS);
  clientLignes.forEach((l, i) => texte(l, LARGEUR / 2 + 10, y - 26 - i * 12, 10, i === 0 ? grasse : normale));
  // Objet.
  texte("Objet", MARGE, y - 12, 8, normale, GRIS);
  const objet = lignesDe(doc.objet, LARGEUR / 2 - MARGE - 15, grasse, 10.5);
  objet.forEach((l, i) => texte(l, MARGE, y - 26 - i * 13, 10.5, grasse));
  let yObjet = y - 26 - objet.length * 13;
  if (doc.datePrestation) {
    texte(`Date de la prestation : ${doc.datePrestation}`, MARGE, yObjet - 2, 9, normale, GRIS);
    yObjet -= 14;
  }
  if (doc.reference) {
    texte(doc.reference, MARGE, yObjet - 2, 9, normale, GRIS);
    yObjet -= 14;
  }
  y = Math.min(y - hClient, yObjet) - 20;

  // Tableau des lignes.
  const entete = () => {
    page.drawRectangle({ x: MARGE, y: y - 18, width: LARGEUR - 2 * MARGE, height: 18, color: ARDOISE });
    let x = MARGE;
    ["Désignation", "Quantité", "Prix unitaire", "Total"].forEach((t, i) => {
      if (i === 0) texte(t, x + 6, y - 12.5, 8.5, grasse, BLANC);
      else aDroite(t, x + COLONNES[i] - 6, y - 12.5, 8.5, grasse, BLANC);
      x += COLONNES[i];
    });
    y -= 18;
  };
  entete();
  for (const l of doc.lignes) {
    const designation = lignesDe(l.designation, COLONNES[0] - 12, normale, 9.5);
    const h = Math.max(1, designation.length) * 12 + 10;
    if (place(h)) entete();
    let x = MARGE;
    COLONNES.forEach((largeur) => {
      page.drawRectangle({ x, y: y - h, width: largeur, height: h, borderColor: BORD, borderWidth: 0.5 });
      x += largeur;
    });
    designation.forEach((t, i) => texte(t, MARGE + 6, y - 14 - i * 12, 9.5));
    const xs = [MARGE + COLONNES[0], MARGE + COLONNES[0] + COLONNES[1], MARGE + COLONNES[0] + COLONNES[1] + COLONNES[2]];
    aDroite(`${quantite(l.quantite)}${l.unite ? ` ${unitePluriel(l.unite, l.quantite)}` : ""}`, xs[0] + COLONNES[1] - 6, y - 14, 9.5);
    aDroite(euros(l.prixUnitaireCentimes), xs[1] + COLONNES[2] - 6, y - 14, 9.5);
    aDroite(euros(totalLigne(l)), xs[2] + COLONNES[3] - 6, y - 14, 9.5, grasse);
    y -= h;
  }
  place(60);
  const total = totalDocument(doc.lignes);
  page.drawRectangle({ x: LARGEUR - MARGE - 200, y: y - 26, width: 200, height: 26, color: FOND });
  texte("Total net à payer", LARGEUR - MARGE - 192, y - 17, 10, grasse);
  aDroite(euros(total), LARGEUR - MARGE - 8, y - 17, 11, grasse);
  y -= 34;
  aDroite(c.mentionTva || MENTION_TVA_DEFAUT, LARGEUR - MARGE, y - 4, 8.5, normale, GRIS);
  y -= 26;

  // Conditions, coordonnées bancaires, mentions.
  const blocs: { titre: string; texte: string }[] = [
    { titre: "Conditions de paiement", texte: doc.conditions || c.conditionsPaiement || CONDITIONS_DEFAUT },
    ...(!estDevis && (c.iban || c.bic) ? [{ titre: "Coordonnées bancaires", texte: [c.iban && `IBAN : ${c.iban}`, c.bic && `BIC : ${c.bic}`].filter(Boolean).join("   ") }] : []),
    ...(!estDevis ? [{ titre: "", texte: c.mentionsFacture || MENTIONS_FACTURE_DEFAUT }] : []),
  ];
  for (const b of blocs) {
    const l = lignesDe(b.texte, LARGEUR - 2 * MARGE, normale, 8.5);
    place(16 + l.length * 11);
    if (b.titre) {
      texte(b.titre, MARGE, y, 9, grasse);
      y -= 13;
    }
    l.forEach((t) => {
      texte(t, MARGE, y, 8.5, normale, GRIS);
      y -= 11;
    });
    y -= 8;
  }

  // Bon pour accord (devis).
  if (estDevis) {
    place(110);
    y -= 6;
    page.drawRectangle({ x: LARGEUR - MARGE - 250, y: y - 95, width: 250, height: 95, borderColor: BORD, borderWidth: 0.8 });
    texte("Bon pour accord", LARGEUR - MARGE - 240, y - 16, 10, grasse);
    lignesDe("Date, nom, signature et cachet du client, précédés de la mention « Bon pour accord »", 230, normale, 8).forEach((t, i) =>
      texte(t, LARGEUR - MARGE - 240, y - 30 - i * 10, 8, normale, GRIS)
    );
    if (c.representant) texte(`Pour l'${c.sigle} : ${c.representant}`, MARGE, y - 16, 9, normale);
  }

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    const pied = `${c.sigle} — ${c.nom}${c.siret ? ` — SIRET ${c.siret}` : ""} · ${estDevis ? "Devis" : "Facture"} ${doc.numero} · page ${i + 1}/${pages.length}`;
    const t = nettoyer(pied, normale);
    p.drawText(t, { x: (LARGEUR - normale.widthOfTextAtSize(t, 7)) / 2, y: 22, size: 7, font: normale, color: GRIS });
  });
  return pdf.save();
}
