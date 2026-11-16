import { PDFDocument } from "pdf-lib";
import { photosEnPdf } from "@/lib/photoEnPdf";

const TAILLE_MAX = 10 * 1024 * 1024;
const estPdf = (o: Uint8Array) => Buffer.from(o.subarray(0, 5)).toString() === "%PDF-";
const estJpeg = (o: Uint8Array) => o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff;

// Les fichiers d'un champ de formulaire (cf. ChoixScan) réunis en un PDF : un PDF tel quel,
// ou des photos JPEG assemblées page par page. null si rien n'a été envoyé.
export async function scanEnPdf(fd: FormData, nom: string): Promise<Buffer | null | { erreur: string }> {
  const fichiers = await Promise.all(
    fd.getAll(nom).filter((f): f is File => f instanceof File && f.size > 0).map(async (f) => new Uint8Array(await f.arrayBuffer()))
  );
  if (fichiers.length === 0) return null;
  if (fichiers.reduce((s, f) => s + f.length, 0) > TAILLE_MAX) return { erreur: "Fichiers trop lourds (10 Mo au total)." };
  if (fichiers.length === 1 && estPdf(fichiers[0])) {
    try {
      await PDFDocument.load(fichiers[0], { ignoreEncryption: true });
    } catch {
      return { erreur: "Ce PDF est illisible ou protégé : exportez-le à nouveau puis réessayez." };
    }
    return Buffer.from(fichiers[0]);
  }
  if (fichiers.every(estJpeg)) return Buffer.from(await photosEnPdf(fichiers));
  return { erreur: "Envoyez un PDF, ou des photos." };
}
