import { describe, expect, it } from "vitest";
import { anneeSixiemePour, classeEnAnnee } from "./cham";

describe("classe CHAM", () => {
  it("avance d'une classe à chaque rentrée, et disparaît après la 3e", () => {
    const anneeSixieme = anneeSixiemePour("4e", 2026); // en 4e en 2026-2027
    expect(anneeSixieme).toBe(2024);
    expect(classeEnAnnee(anneeSixieme, 2024)).toBe("6e");
    expect(classeEnAnnee(anneeSixieme, 2026)).toBe("4e");
    expect(classeEnAnnee(anneeSixieme, 2027)).toBe("3e");
    expect(classeEnAnnee(anneeSixieme, 2028)).toBeNull();
    expect(classeEnAnnee(anneeSixieme, 2023)).toBeNull();
  });

  it("classe inconnue ou invalide", () => {
    expect(classeEnAnnee(null, 2026)).toBeNull();
    expect(anneeSixiemePour("2nde", 2026)).toBeNull();
  });
});
