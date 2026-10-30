import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { copieIndependante, genererBulletinPdf } from "./bulletinPdf";
import { LOGO_EMI4M } from "./bulletinLogos";

// Image placée au milieu d'une zone mémoire plus grande, comme peuvent l'être en production
// les octets d'un Buffer Node ou d'un champ Bytes venu de la base.
function auMilieuDUneZone(octets: Uint8Array): Uint8Array {
  const zone = new Uint8Array(octets.length + 64);
  zone.set(octets, 64);
  return zone.subarray(64);
}

describe("images du bulletin", () => {
  const jpeg = Buffer.from(LOGO_EMI4M, "base64");

  it("pdf-lib échoue sur une image décalée dans sa zone mémoire", async () => {
    const pdf = await PDFDocument.create();
    await expect(pdf.embedJpg(auMilieuDUneZone(jpeg))).rejects.toThrow("SOI not found in JPEG");
  });

  it("la copie indépendante corrige le problème", async () => {
    const pdf = await PDFDocument.create();
    await expect(pdf.embedJpg(copieIndependante(auMilieuDUneZone(jpeg)))).resolves.toBeDefined();
  });

  it("génère un bulletin complet", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64"
    );
    const signature = auMilieuDUneZone(png);
    const pdf = await genererBulletinPdf({
      eleve: { prenom: "Léa", nom: "Martin" },
      anneeDebut: 2026,
      trimestre: 1,
      parties: [
        { matiere: "INSTRUMENT", precision: "Piano", profId: "p1", profNom: "Jeanne Dupont", texte: "Très bien 🎵", signature, signeLe: new Date() },
      ],
      bilan: { texte: "Bilan", signature, directionNom: "Direction" },
    });
    expect(Buffer.from(pdf.subarray(0, 5)).toString()).toBe("%PDF-");
  });
});
