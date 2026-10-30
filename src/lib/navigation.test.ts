import { describe, expect, it } from "vitest";
import { lienActif, PARAMETRES, SECTIONS, sectionsPour } from "./navigation";

const tous = [...SECTIONS.flatMap((s) => s.liens), ...PARAMETRES];

describe("lienActif", () => {
  it("allume le lien le plus précis", () => {
    expect(lienActif("/frais/identite", tous)).toBe("/frais/identite");
    expect(lienActif("/frais", tous)).toBe("/frais");
    expect(lienActif("/presences/historique", tous)).toBe("/presences");
    expect(lienActif("/admin/parametres/salles", tous)).toBe("/admin/parametres/salles");
    expect(lienActif("/admin/parametres", tous)).toBe("/admin/parametres");
  });

  it("ne confond pas deux pages au début semblable", () => {
    expect(lienActif("/agenda", tous)).toBe("/agenda");
    expect(lienActif("/annuaire", tous)).toBe("/annuaire");
  });
});

describe("sectionsPour", () => {
  it("ne montre la rubrique Direction qu'à la direction", () => {
    expect(sectionsPour(false).some((s) => s.direction)).toBe(false);
    expect(sectionsPour(true).some((s) => s.direction)).toBe(true);
  });
});
