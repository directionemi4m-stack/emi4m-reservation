import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { genererCopieSignee, genererRegistreDocument } from "./attestationPdf";

// Octets décalés dans une zone mémoire plus grande, comme ceux venus de la base en production.
function auMilieuDUneZone(octets: Uint8Array): Uint8Array {
  const zone = new Uint8Array(octets.length + 64);
  zone.set(octets, 64);
  return zone.subarray(64);
}

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);
const document = { titre: "Procédure d'évacuation", version: 2, publieLe: new Date("2026-11-02T10:00:00Z") };

async function originalDeTroisPages() {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < 3; i++) pdf.addPage();
  return pdf.save();
}

describe("copie signée", () => {
  it("garde toutes les pages du document et ajoute l'attestation", async () => {
    const octets = await genererCopieSignee({
      original: auMilieuDUneZone(await originalDeTroisPages()),
      document,
      attestation: "Je certifie avoir lu cette procédure et repéré, à mon étage, l'escalier, l'extincteur et le boîtier d'alarme les plus proches — y compris en soirée.",
      signataire: { nom: "Jeanne Rival", email: "jeanne@example.org" },
      signeLe: new Date("2026-11-03T08:30:00Z"),
      signature: auMilieuDUneZone(png),
    });
    expect((await PDFDocument.load(octets)).getPageCount()).toBe(4);
  });
});

describe("registre", () => {
  it("passe sur plusieurs pages quand la liste est longue", async () => {
    const lignes = Array.from({ length: 30 }, (_, i) => ({
      nom: `Prof ${i} Œuvre`,
      signeLe: i % 2 ? new Date() : null,
      signature: i % 2 ? auMilieuDUneZone(png) : null,
    }));
    const octets = await genererRegistreDocument({ document, lignes });
    expect((await PDFDocument.load(octets)).getPageCount()).toBe(2);
  });
});
