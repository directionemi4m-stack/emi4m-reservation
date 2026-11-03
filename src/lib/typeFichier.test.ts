import { describe, expect, it } from "vitest";
import { contenuCorrespond } from "./typeFichier";

const octets = (...valeurs: (number | string)[]) =>
  Uint8Array.from(valeurs.flatMap((v) => (typeof v === "string" ? [...v].map((c) => c.charCodeAt(0)) : [v])));

describe("contenuCorrespond", () => {
  it("reconnaît les vrais fichiers", () => {
    expect(contenuCorrespond(octets("%PDF-1.7"), "application/pdf")).toBe(true);
    expect(contenuCorrespond(octets(0xff, 0xd8, 0xff, 0xe0), "image/jpeg")).toBe(true);
    expect(contenuCorrespond(octets(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a), "image/png")).toBe(true);
    expect(contenuCorrespond(octets("RIFF", 0, 0, 0, 0, "WEBP"), "image/webp")).toBe(true);
    expect(contenuCorrespond(octets(0, 0, 0, 0x18, "ftypheic"), "image/heic")).toBe(true);
  });

  it("refuse un fichier déguisé ou un type inconnu", () => {
    expect(contenuCorrespond(octets("<html>"), "application/pdf")).toBe(false);
    expect(contenuCorrespond(octets("%PDF-1.7"), "image/jpeg")).toBe(false);
    expect(contenuCorrespond(octets("%PDF-1.7"), "text/html")).toBe(false);
  });
});
