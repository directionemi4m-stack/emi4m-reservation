import { describe, expect, it } from "vitest";
import { acceptePassages, lireMorceaux, resumeProgramme } from "./programmes";

describe("programmes", () => {
  it("lit les œuvres en ignorant les lignes vides", () => {
    const r = lireMorceaux({
      titres: ["Menuet en sol", "", "Le Cygne"],
      compositeurs: ["J.S. Bach", "", "C. Saint-Saëns"],
      arrangeurs: ["", "", "M. Durand"],
      durees: ["1'45", "", "3'"],
    });
    expect(r).toEqual({
      morceaux: [
        { titre: "Menuet en sol", compositeur: "J.S. Bach", arrangeur: null, dureeSecondes: 105 },
        { titre: "Le Cygne", compositeur: "C. Saint-Saëns", arrangeur: "M. Durand", dureeSecondes: 180 },
      ],
    });
    if ("morceaux" in r) {
      expect(resumeProgramme(r.morceaux)).toBe("Menuet en sol (J.S. Bach) ; Le Cygne (C. Saint-Saëns, arr. M. Durand)");
    }
  });

  it("exige le titre, le compositeur et une durée lisible", () => {
    expect(lireMorceaux({ titres: [""], compositeurs: [""], arrangeurs: [""], durees: [""] })).toEqual({ erreur: "Indiquez au moins une œuvre jouée." });
    expect(lireMorceaux({ titres: ["Valse"], compositeurs: [""], arrangeurs: [""], durees: ["2'"] })).toHaveProperty("erreur");
    expect(lireMorceaux({ titres: ["Valse"], compositeurs: ["Chopin"], arrangeurs: [""], durees: ["deux minutes"] })).toHaveProperty("erreur");
  });

  it("ouvre les inscriptions à tous les événements sauf les réunions", () => {
    expect(acceptePassages("CONCERT")).toBe(true);
    expect(acceptePassages("HEURE_MUSICALE")).toBe(true);
    expect(acceptePassages("REUNION")).toBe(false);
  });
});
