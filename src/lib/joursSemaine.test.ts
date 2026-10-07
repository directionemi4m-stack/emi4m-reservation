import { describe, expect, it } from "vitest";
import { infoSansJour, libelleJourCours, libelleJourSemaine } from "./joursSemaine";

describe("libelleJourSemaine", () => {
  it("traduit la valeur de l'enum en libellé lisible", () => {
    expect(libelleJourSemaine("VENDREDI")).toBe("Vendredi");
    expect(libelleJourSemaine(null)).toBeNull();
  });
});

describe("infoSansJour", () => {
  it("retire le jour répété en tête, quelle que soit la casse ou les accents", () => {
    expect(infoSansJour("MARDI", "MARDI 5ème CHAM")).toBe("5ème CHAM");
    expect(infoSansJour("MARDI", "Mardi 16h45 - 17h30")).toBe("16h45 - 17h30");
    expect(infoSansJour("VENDREDI", "vendredi")).toBeNull();
    expect(infoSansJour("JEUDI", "Jeudi après midi")).toBe("après midi");
  });

  it("garde le texte intact s'il ne commence pas par le jour du cours", () => {
    expect(infoSansJour("MERCREDI", "17h, salle 2")).toBe("17h, salle 2");
    expect(infoSansJour("LUNDI", "Mardi 17h")).toBe("Mardi 17h");
  });

  it("ne coupe pas un mot qui commence seulement comme un jour", () => {
    expect(infoSansJour("LUNDI", "Lundis pairs")).toBe("Lundis pairs");
  });

  it("renvoie null pour un texte vide", () => {
    expect(infoSansJour("LUNDI", "  ")).toBeNull();
    expect(infoSansJour("LUNDI", null)).toBeNull();
  });
});

describe("libelleJourCours", () => {
  it("affiche le jour structuré suivi de l'info complémentaire", () => {
    expect(libelleJourCours({ jourSemaine: "MARDI", jour: "MARDI 14h15 - 15h 5ème CHAM" })).toBe(
      "Mardi · 14h15 - 15h 5ème CHAM"
    );
  });

  it("affiche le jour seul quand il n'y a pas d'info complémentaire", () => {
    expect(libelleJourCours({ jourSemaine: "VENDREDI", jour: null })).toBe("Vendredi");
    expect(libelleJourCours({ jourSemaine: "VENDREDI", jour: "Vendredi" })).toBe("Vendredi");
  });
});
