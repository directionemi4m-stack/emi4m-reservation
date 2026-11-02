import { describe, expect, it } from "vitest";
import { avancement, estPdf, nomCopieSignee, nomRegistre, relanceDue, titreDepuisNomFichier } from "./documentsSignes";

describe("relanceDue", () => {
  const publie = new Date("2026-11-02T10:00:00Z");
  it("attend une semaine pleine", () => {
    expect(relanceDue(publie, new Date("2026-11-08T23:00:00Z"))).toBe(false);
    expect(relanceDue(publie, new Date("2026-11-09T10:00:00Z"))).toBe(true);
  });
});

describe("estPdf", () => {
  it("reconnaît l'en-tête %PDF", () => {
    expect(estPdf(new TextEncoder().encode("%PDF-1.7 ..."))).toBe(true);
    expect(estPdf(new TextEncoder().encode("<html>"))).toBe(false);
  });
});

describe("titreDepuisNomFichier", () => {
  it("propose un titre lisible", () => {
    expect(titreDepuisNomFichier("Procedure_evacuation_EMI4M_Villard_1.pdf")).toBe("Procedure evacuation EMI4M Villard");
    expect(titreDepuisNomFichier("consignes.PDF")).toBe("Consignes");
    expect(titreDepuisNomFichier(".pdf")).toBe("");
  });
});

describe("noms de fichiers", () => {
  it("sont sans caractères interdits par le Drive", () => {
    expect(nomCopieSignee({ titre: "Consignes / Villard", version: 2, prenom: "Jeanne", nom: "Rival" })).toBe(
      "RIVAL Jeanne - Consignes Villard v2 signé.pdf"
    );
    expect(nomRegistre({ titre: "Procédure d'évacuation", version: 1 })).toBe("Registre des signatures - Procédure d'évacuation v1.pdf");
  });
});

describe("avancement", () => {
  it("compte les signatures de la liste des signataires seulement", () => {
    const d = new Date("2026-11-03T08:00:00Z");
    const r = avancement([{ id: "a" }, { id: "b" }, { id: "c" }], [
      { userId: "b", signeLe: d },
      { userId: "parti", signeLe: d },
    ]);
    expect(r).toEqual({
      signes: 1,
      total: 3,
      etats: [
        { userId: "a", signeLe: null },
        { userId: "b", signeLe: d },
        { userId: "c", signeLe: null },
      ],
    });
  });
});
