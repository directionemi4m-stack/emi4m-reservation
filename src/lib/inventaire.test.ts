import { describe, expect, it } from "vitest";
import { formaterEuros, lireEuros, nomDossierArticle } from "./inventaire";

describe("montants", () => {
  it("lit les montants saisis à la française", () => {
    expect(lireEuros("3 887,45")).toBe(388745);
    expect(lireEuros("1020 €")).toBe(102000);
    expect(lireEuros("65.85")).toBe(6585);
    expect(lireEuros("")).toBeNull();
    expect(lireEuros("douze")).toBeNull();
    expect(lireEuros("1,234")).toBeNull();
  });

  it("affiche les centimes en euros", () => {
    expect(formaterEuros(388745)).toBe("3 887,45 €");
    expect(formaterEuros(6585)).toBe("65,85 €");
  });
});

describe("nomDossierArticle", () => {
  it("préfixe le numéro d'immobilisation quand il existe", () => {
    expect(nomDossierArticle({ numeroImmo: 12, designation: "PIANO B.BERTHET" })).toBe("N°12 — PIANO B.BERTHET");
    expect(nomDossierArticle({ numeroImmo: null, designation: "Pupitre 1/2" })).toBe("Pupitre 1-2");
  });
});
