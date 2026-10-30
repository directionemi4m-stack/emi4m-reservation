import { describe, expect, it } from "vitest";
import { celluleTexte, cleEleve, libelleAnneeLocation, reconduire } from "./locations";

describe("libelleAnneeLocation", () => {
  it("écrit 1re puis 2e, 3e…", () => {
    expect(libelleAnneeLocation(1)).toBe("1re année");
    expect(libelleAnneeLocation(2)).toBe("2e année");
    expect(libelleAnneeLocation(4)).toBe("4e année");
  });
});

describe("cleEleve", () => {
  it("ignore casse et accents", () => {
    expect(cleEleve("Léa", "LASCURETTES")).toBe(cleEleve("lea", "Lascurettes"));
  });
});

describe("reconduire", () => {
  const avant = [
    { instrument: "Flûte", prenom: "Avril", nom: "Blanchard", anneeLocation: 2, nbMois: 9 },
    { instrument: "Saxo", prenom: "Gabin", nom: "Balme", anneeLocation: 1, nbMois: 12 },
  ];

  it("passe chaque location à l'année suivante", () => {
    expect(reconduire(avant, [])).toEqual([
      { instrument: "Flûte", prenom: "Avril", nom: "Blanchard", anneeLocation: 3, nbMois: 9 },
      { instrument: "Saxo", prenom: "Gabin", nom: "Balme", anneeLocation: 2, nbMois: 12 },
    ]);
  });

  it("ne duplique pas un élève déjà saisi dans la nouvelle saison", () => {
    const r = reconduire(avant, [{ prenom: "gabin", nom: "BALME", instrument: "saxo" }]);
    expect(r.map((l) => l.prenom)).toEqual(["Avril"]);
  });
});

describe("celluleTexte", () => {
  it("neutralise ce qui ressemble à une formule", () => {
    expect(celluleTexte("=IMPORTXML(1)")).toBe("'=IMPORTXML(1)");
    expect(celluleTexte("Caution OK")).toBe("Caution OK");
    expect(celluleTexte(null)).toBe("");
  });
});
