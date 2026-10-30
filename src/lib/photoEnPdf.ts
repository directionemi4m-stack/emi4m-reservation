import { PDFDocument } from "pdf-lib";

// Photos d'un document papier (déjà réduites et remises à l'endroit par le navigateur, en
// JPEG) assemblées en un PDF, une page A4 par photo : l'archive ne contient ainsi que des PDF.
export async function photosEnPdf(photos: Uint8Array[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const [largeurA4, hauteurA4] = [595.28, 841.89];
  const marge = 20;
  for (const photo of photos) {
    // Copie indépendante : pdf-lib lit image.buffer depuis le début (cf. bulletinPdf.ts).
    const image = await pdf.embedJpg(Uint8Array.from(photo));
    const paysage = image.width > image.height;
    const [l, h] = paysage ? [hauteurA4, largeurA4] : [largeurA4, hauteurA4];
    const page = pdf.addPage([l, h]);
    const echelle = Math.min((l - 2 * marge) / image.width, (h - 2 * marge) / image.height);
    const li = image.width * echelle;
    const hi = image.height * echelle;
    page.drawImage(image, { x: (l - li) / 2, y: (h - hi) / 2, width: li, height: hi });
  }
  return pdf.save();
}
