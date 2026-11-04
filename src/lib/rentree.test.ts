import { describe, expect, it } from "vitest";
import { ETAPES_AUTO, ETAPES_MANUELLES, estEtapeManuelle, saisonARentrer } from "./rentree";

describe("saisonARentrer", () => {
  it("prépare la saison de septembre dès le mois de juin", () => {
    expect(saisonARentrer(new Date("2026-11-04T00:00:00Z"))).toBe(2026);
    expect(saisonARentrer(new Date("2027-05-31T00:00:00Z"))).toBe(2026);
    expect(saisonARentrer(new Date("2027-06-01T00:00:00Z"))).toBe(2027);
  });
});

describe("étapes", () => {
  it("ont des clés uniques", () => {
    const cles = [...ETAPES_AUTO, ...ETAPES_MANUELLES].map((e) => e.cle);
    expect(new Set(cles).size).toBe(cles.length);
    expect(estEtapeManuelle("cham")).toBe(true);
    expect(estEtapeManuelle("annuaire")).toBe(false);
  });
});
