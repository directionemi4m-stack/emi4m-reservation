import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { copieIndependante, nettoyer } from "@/lib/bulletinPdf";
import { LOGO_EMI4M } from "@/lib/bulletinLogos";
import { decouperLignes } from "@/lib/bulletinsCham";
import { dateCourte } from "@/lib/documentsSignes";

const LARGEUR = 595.28;
const HAUTEUR = 841.89;
const MARGE = 50;
const ARDOISE = rgb(0.17, 0.24, 0.31);
const GRIS = rgb(0.45, 0.49, 0.53);
const BORD = rgb(0.75, 0.78, 0.82);

const heure = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

export interface InfosDocument {
  titre: string;
  version: number;
  publieLe: Date;
}

async function outils(pdf: PDFDocument) {
  const normale = await pdf.embedFont(StandardFonts.Helvetica);
  const grasse = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedJpg(copieIndependante(Buffer.from(LOGO_EMI4M, "base64")));
  const texte = (page: PDFPage, t: string, x: number, y: number, taille: number, police: PDFFont, couleur = ARDOISE) =>
    page.drawText(nettoyer(t, police), { x, y, size: taille, font: police, color: couleur });
  const signature = async (page: PDFPage, png: Uint8Array, x: number, bas: number, largeurMax: number, hauteurMax: number) => {
    const image = await pdf.embedPng(copieIndependante(png));
    const echelle = Math.min(largeurMax / image.width, hauteurMax / image.height);
    page.drawImage(image, { x, y: bas, width: image.width * echelle, height: image.height * echelle });
  };
  // En-tête commun : logo, nom de l'école, titre ; renvoie la hauteur où continuer.
  const entete = (page: PDFPage, titre: string, sousTitre: string) => {
    const y = HAUTEUR - MARGE;
    page.drawImage(logo, { x: MARGE, y: y - 50, width: (logo.width * 50) / logo.height, height: 50 });
    texte(page, "EMI4M · École Musicale Itinérante des 4 Montagnes", MARGE + 62, y - 14, 9, grasse, GRIS);
    texte(page, titre, MARGE + 62, y - 34, 18, grasse);
    texte(page, sousTitre, MARGE, y - 72, 11, normale, GRIS);
    page.drawLine({ start: { x: MARGE, y: y - 82 }, end: { x: LARGEUR - MARGE, y: y - 82 }, thickness: 1, color: ARDOISE });
    return y - 108;
  };
  return { normale, grasse, texte, signature, entete };
}

const sousTitreVersion = (d: InfosDocument) => `${d.titre} · version ${d.version} du ${dateCourte(d.publieLe)}`;

// La copie signée d'un salarié : le document tel qu'il l'a lu, suivi d'une page
// d'attestation avec la phrase signée, son nom, la date et sa signature.
export async function genererCopieSignee(params: {
  original: Uint8Array;
  document: InfosDocument;
  attestation: string;
  signataire: { nom: string; email: string };
  signeLe: Date;
  signature: Uint8Array;
}): Promise<Uint8Array> {
  const source = await PDFDocument.load(copieIndependante(params.original), { ignoreEncryption: true });
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${params.document.titre} — signé par ${params.signataire.nom}`);
  pdf.setAuthor("EMI4M");
  const pages = await pdf.copyPages(source, source.getPageIndices());
  pages.forEach((p) => pdf.addPage(p));

  const o = await outils(pdf);
  const page = pdf.addPage([LARGEUR, HAUTEUR]);
  let y = o.entete(page, "Attestation de lecture", sousTitreVersion(params.document));

  for (const ligne of decouperLignes(params.attestation, LARGEUR - 2 * MARGE, (t) => o.normale.widthOfTextAtSize(nettoyer(t, o.normale), 12))) {
    o.texte(page, ligne, MARGE, y, 12, o.normale);
    y -= 18;
  }
  y -= 16;
  o.texte(page, "Nom :", MARGE, y, 11, o.normale, GRIS);
  o.texte(page, params.signataire.nom, MARGE + 90, y, 11, o.grasse);
  y -= 18;
  o.texte(page, "Signé le :", MARGE, y, 11, o.normale, GRIS);
  o.texte(page, `${dateCourte(params.signeLe)} à ${heure(params.signeLe)}`, MARGE + 90, y, 11, o.normale);
  y -= 26;
  o.texte(page, "Signature :", MARGE, y, 11, o.normale, GRIS);
  page.drawRectangle({ x: MARGE + 90, y: y - 82, width: 240, height: 90, borderColor: BORD, borderWidth: 0.8 });
  await o.signature(page, params.signature, MARGE + 96, y - 76, 228, 78);
  y -= 112;
  o.texte(
    page,
    `Signature électronique recueillie dans l'appli EMI4M Réservation (compte ${params.signataire.email}).`,
    MARGE,
    y,
    8.5,
    o.normale,
    GRIS
  );
  return pdf.save();
}

export interface LigneRegistreDocument {
  nom: string;
  signeLe: Date | null;
  signature: Uint8Array | null;
}

const COLONNES = [190, 110, 195]; // nom, date, signature
const HAUT_LIGNE = 40;
const HAUT_ENTETE = 22;

// Le registre d'une version : tous les salariés concernés, avec la date et la signature
// de ceux qui ont signé (ligne vide pour les autres), à présenter à la commission de sécurité.
export async function genererRegistreDocument(params: { document: InfosDocument; lignes: LigneRegistreDocument[] }): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Registre des signatures — ${params.document.titre}`);
  pdf.setAuthor("EMI4M");
  const o = await outils(pdf);

  let page = pdf.addPage([LARGEUR, HAUTEUR]);
  let y = o.entete(page, "Registre des signatures", sousTitreVersion(params.document));
  const signes = params.lignes.filter((l) => l.signeLe).length;
  o.texte(page, `${signes} signature${signes > 1 ? "s" : ""} sur ${params.lignes.length} salarié${params.lignes.length > 1 ? "s" : ""}.`, MARGE, y, 10, o.normale);
  y -= 18;

  const enteteTableau = () => {
    page.drawRectangle({ x: MARGE, y: y - HAUT_ENTETE, width: LARGEUR - 2 * MARGE, height: HAUT_ENTETE, color: ARDOISE });
    let x = MARGE;
    ["Nom", "Date", "Signature"].forEach((t, i) => {
      o.texte(page, t, x + 6, y - 15, 9, o.grasse, rgb(1, 1, 1));
      x += COLONNES[i];
    });
    y -= HAUT_ENTETE;
  };
  enteteTableau();

  for (const l of params.lignes) {
    if (y - HAUT_LIGNE < MARGE + 30) {
      page = pdf.addPage([LARGEUR, HAUTEUR]);
      y = HAUTEUR - MARGE;
      enteteTableau();
    }
    let x = MARGE;
    COLONNES.forEach((largeur) => {
      page.drawRectangle({ x, y: y - HAUT_LIGNE, width: largeur, height: HAUT_LIGNE, borderColor: BORD, borderWidth: 0.6 });
      x += largeur;
    });
    o.texte(page, l.nom, MARGE + 6, y - 24, 10, o.grasse);
    o.texte(page, l.signeLe ? dateCourte(l.signeLe) : "Non signé", MARGE + COLONNES[0] + 6, y - 24, 10, o.normale, l.signeLe ? ARDOISE : GRIS);
    if (l.signature) await o.signature(page, l.signature, MARGE + COLONNES[0] + COLONNES[1] + 6, y - HAUT_LIGNE + 4, COLONNES[2] - 12, HAUT_LIGNE - 8);
    y -= HAUT_LIGNE;
  }

  if (y - 20 < MARGE) {
    page = pdf.addPage([LARGEUR, HAUTEUR]);
    y = HAUTEUR - MARGE;
  }
  o.texte(page, `Édité le ${dateCourte(new Date())}. Signatures recueillies dans l'appli EMI4M Réservation.`, MARGE, y - 18, 8.5, o.normale, GRIS);

  const toutes = pdf.getPages();
  toutes.forEach((p, i) => {
    const pied = `EMI4M — Registre des signatures · ${params.document.titre} · page ${i + 1}/${toutes.length}`;
    const largeur = o.normale.widthOfTextAtSize(nettoyer(pied, o.normale), 7.5);
    o.texte(p, pied, (LARGEUR - largeur) / 2, 20, 7.5, o.normale, GRIS);
  });
  return pdf.save();
}
