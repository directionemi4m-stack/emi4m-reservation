import { describe, expect, it } from "vitest";
import { enCirculation, resumeAcces, totalAcces } from "./cles";

describe("resumeAcces", () => {
  it("décrit les accès remis, au singulier ou au pluriel", () => {
    expect(resumeAcces({ clesAutransMeaudre: 2, badgeLans: 1, clesVillard: 0 })).toBe("2 clés A/M · 1 badge Lans");
    expect(resumeAcces({ clesAutransMeaudre: 0, badgeLans: 0, clesVillard: 1 })).toBe("1 clé Villard");
    expect(resumeAcces({ clesAutransMeaudre: 0, badgeLans: 0, clesVillard: 0 })).toBe("");
  });
});

describe("enCirculation", () => {
  it("additionne seulement les remises pas encore restituées", () => {
    const remises = [
      { clesAutransMeaudre: 1, badgeLans: 1, clesVillard: 0, restitueLe: null },
      { clesAutransMeaudre: 0, badgeLans: 0, clesVillard: 2, restitueLe: null },
      { clesAutransMeaudre: 3, badgeLans: 0, clesVillard: 0, restitueLe: new Date() },
    ];
    const q = enCirculation(remises);
    expect(q).toEqual({ clesAutransMeaudre: 1, badgeLans: 1, clesVillard: 2 });
    expect(totalAcces(q)).toBe(4);
  });
});
