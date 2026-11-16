import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { copieIndependante, nettoyer } from "@/lib/bulletinPdf";
import { LOGO_EMI4M } from "@/lib/bulletinLogos";
import { decouperLignes } from "@/lib/bulletinsCham";

const LARGEUR = 595.28;
const HAUTEUR = 841.89;
const MARGE = 50;
const ARDOISE = rgb(0.17, 0.24, 0.31);
const GRIS = rgb(0.45, 0.49, 0.53);
const BORD = rgb(0.75, 0.78, 0.82);

const quand = (d: Date) =>
  `${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" })} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}`;

export interface SignataireContrat {
  role: string; // « Pour l'EMI4M » / « Le salarié »
  nom: string;
  detail: string; // qualité, ou adresse mail du compte
  signeLe: Date;
  paraphe: Uint8Array;
  signature: Uint8Array;
}

// La copie d'un contrat ou avenant : chaque page de l'original reçoit, en bas à droite, les
// paraphes de ceux qui ont déjà signé ; une dernière page reprend les signatures, avec la date,
// l'heure et l'empreinte du document d'origine.
export async function genererContratSigne(params: {
  original: Uint8Array;
  titre: string; // « Contrat 2026-2027 — CDI temps partiel »
  salarie: string;
  empreinte: string;
  signataires: SignataireContrat[];
}): Promise<Uint8Array> {
  const source = await PDFDocument.load(copieIndependante(params.original), { ignoreEncryption: true });
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${params.titre} — ${params.salarie}`);
  pdf.setAuthor("EMI4M");
  const pages = await pdf.copyPages(source, source.getPageIndices());
  pages.forEach((p) => pdf.addPage(p));

  const normale = await pdf.embedFont(StandardFonts.Helvetica);
  const grasse = await pdf.embedFont(StandardFonts.HelveticaBold);
  const texte = (page: PDFPage, t: string, x: number, y: number, taille: number, police: PDFFont, couleur = ARDOISE) =>
    page.drawText(nettoyer(t, police), { x, y, size: taille, font: police, color: couleur });
  const images = await Promise.all(
    params.signataires.map(async (s) => ({
      paraphe: await pdf.embedPng(copieIndependante(s.paraphe)),
      signature: await pdf.embedPng(copieIndependante(s.signature)),
    }))
  );
  const poser = (page: PDFPage, image: (typeof images)[number]["paraphe"], x: number, y: number, l: number, h: number) => {
    const e = Math.min(l / image.width, h / image.height);
    page.drawImage(image, { x: x + (l - image.width * e) / 2, y: y + (h - image.height * e) / 2, width: image.width * e, height: image.height * e });
  };

  // Paraphes : petites cases en bas à droite de chaque page, quelle que soit sa taille.
  if (params.signataires.length) {
    const l = 62;
    const h = 30;
    for (const page of pages) {
      const { width } = page.getSize();
      params.signataires.forEach((s, i) => {
        const x = width - 20 - (params.signataires.length - i) * (l + 6);
        page.drawRectangle({ x, y: 14, width: l, height: h, borderColor: BORD, borderWidth: 0.5, color: rgb(1, 1, 1), opacity: 0.85 });
        poser(page, images[i].paraphe, x + 2, 16, l - 4, h - 4);
      });
    }
  }

  // Page des signatures.
  const page = pdf.addPage([LARGEUR, HAUTEUR]);
  const logo = await pdf.embedJpg(copieIndependante(Buffer.from(LOGO_EMI4M, "base64")));
  let y = HAUTEUR - MARGE;
  page.drawImage(logo, { x: MARGE, y: y - 50, width: (logo.width * 50) / logo.height, height: 50 });
  texte(page, "EMI4M · École Musicale Itinérante des 4 Montagnes", MARGE + 62, y - 14, 9, grasse, GRIS);
  texte(page, "Signatures", MARGE + 62, y - 34, 18, grasse);
  y -= 72;
  for (const ligne of decouperLignes(`${params.titre} — ${params.salarie}`, LARGEUR - 2 * MARGE, (t) => normale.widthOfTextAtSize(nettoyer(t, normale), 11))) {
    texte(page, ligne, MARGE, y, 11, normale, GRIS);
    y -= 15;
  }
  page.drawLine({ start: { x: MARGE, y: y + 4 }, end: { x: LARGEUR - MARGE, y: y + 4 }, thickness: 1, color: ARDOISE });
  y -= 24;
  texte(page, pages.length > 1 ? `Document de ${pages.length} pages, paraphées par chaque signataire.` : "Document d'une page, paraphée par chaque signataire.", MARGE, y, 10, normale);
  y -= 30;

  for (const [i, s] of params.signataires.entries()) {
    texte(page, s.role, MARGE, y, 10, grasse, GRIS);
    y -= 16;
    texte(page, s.nom, MARGE, y, 12, grasse);
    if (s.detail) texte(page, s.detail, MARGE, y - 15, 10, normale, GRIS);
    texte(page, `« Lu et approuvé » — signé le ${quand(s.signeLe)}`, MARGE, y - 30, 10, normale);
    page.drawRectangle({ x: MARGE, y: y - 130, width: 240, height: 90, borderColor: BORD, borderWidth: 0.8 });
    poser(page, images[i].signature, MARGE + 6, y - 124, 228, 78);
    page.drawRectangle({ x: MARGE + 260, y: y - 130, width: 90, height: 45, borderColor: BORD, borderWidth: 0.8 });
    poser(page, images[i].paraphe, MARGE + 263, y - 127, 84, 39);
    texte(page, "Paraphe", MARGE + 260, y - 80, 8, normale, GRIS);
    y -= 160;
  }

  y = Math.min(y, 120);
  for (const ligne of decouperLignes(
    `Signatures électroniques recueillies dans l'appli EMI4M Réservation. Empreinte SHA-256 du document signé : ${params.empreinte}`,
    LARGEUR - 2 * MARGE,
    (t) => normale.widthOfTextAtSize(nettoyer(t, normale), 8)
  )) {
    texte(page, ligne, MARGE, y, 8, normale, GRIS);
    y -= 11;
  }
  return pdf.save();
}
