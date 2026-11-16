import { describe, expect, it } from "vitest";
import { lireLignesAchat, montantEnLettres, nombreEnLettres, prochainNumeroAchat } from "./attestationAchat";

describe("attestation d'achat d'occasion", () => {
  it("écrit les nombres en lettres", () => {
    const cas: [number, string][] = [
      [0, "zéro"],
      [1, "un"],
      [17, "dix-sept"],
      [21, "vingt et un"],
      [71, "soixante et onze"],
      [77, "soixante-dix-sept"],
      [80, "quatre-vingts"],
      [81, "quatre-vingt-un"],
      [91, "quatre-vingt-onze"],
      [99, "quatre-vingt-dix-neuf"],
      [100, "cent"],
      [101, "cent un"],
      [200, "deux cents"],
      [250, "deux cent cinquante"],
      [1000, "mille"],
      [1250, "mille deux cent cinquante"],
      [2000, "deux mille"],
      [80000, "quatre-vingt mille"],
      [200000, "deux cent mille"],
      [1500000, "un million cinq cent mille"],
    ];
    for (const [n, attendu] of cas) expect(nombreEnLettres(n)).toBe(attendu);
  });

  it("écrit un montant en euros et centimes", () => {
    expect(montantEnLettres(25000)).toBe("deux cent cinquante euros");
    expect(montantEnLettres(125050)).toBe("mille deux cent cinquante euros et cinquante centimes");
    expect(montantEnLettres(101)).toBe("un euro et un centime");
  });

  it("numérote et lit les lignes", () => {
    expect(prochainNumeroAchat(2026, ["ACH-2026-004", "ACH-2025-010"])).toBe("ACH-2026-005");
    const r = lireLignesAchat({ designations: ["Trompette", ""], marques: ["Yamaha YTR-2330", ""], series: ["A12345", ""], etats: ["Très bon état", ""], prix: ["250", ""] });
    expect(r).toEqual({ lignes: [{ designation: "Trompette", marqueModele: "Yamaha YTR-2330", numeroSerie: "A12345", etat: "Très bon état", prixCentimes: 25000 }] });
    expect(lireLignesAchat({ designations: [""], marques: [""], series: [""], etats: [""], prix: [""] })).toHaveProperty("erreur");
  });
});
