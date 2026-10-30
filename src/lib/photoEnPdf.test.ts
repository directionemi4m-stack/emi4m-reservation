import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { photosEnPdf } from "./photoEnPdf";
import { LOGO_ISERE, LOGO_EMI4M } from "./bulletinLogos";

describe("photosEnPdf", () => {
  it("met chaque photo sur sa propre page, orientée selon la photo", async () => {
    const paysage = Buffer.from(LOGO_ISERE, "base64"); // plus large que haute
    const portrait = Buffer.from(LOGO_EMI4M, "base64"); // presque carrée, plus haute que large
    const octets = await photosEnPdf([paysage, portrait]);
    const pdf = await PDFDocument.load(octets);
    expect(pdf.getPageCount()).toBe(2);
    const [p1, p2] = pdf.getPages();
    expect(p1.getWidth()).toBeGreaterThan(p1.getHeight());
    expect(p2.getWidth()).toBeLessThan(p2.getHeight());
  });
});
