import { describe, expect, it } from "vitest";
import { contenuOngletActivite, contenuOngletBareme } from "./ongletsExplicatifs";

describe("contenuOngletBareme", () => {
  const { lignes, titres } = contenuOngletBareme([
    { nom: "Villard/Lans en Vercors", km: 18, prix: 3.6 },
    { nom: "Villard/Autrans", km: 36, prix: 6.4 },
  ]);

  it("liste le barème trié, avec le taux exact", () => {
    const i = lignes.findIndex((l) => l[0] === "Trajet");
    expect(lignes[i]).toEqual(["Trajet", "Km", "Montant (€)", "Taux (€/km)"]);
    expect(lignes[i + 1]).toEqual(["Villard/Autrans", 36, 6.4, 0.177778]);
    expect(lignes[i + 2]).toEqual(["Villard/Lans en Vercors", 18, 3.6, 0.2]);
  });

  it("met en gras les titres et l'en-tête du tableau", () => {
    expect(titres).toContain(0);
    expect(titres).toContain(lignes.findIndex((l) => l[0] === "Trajet"));
    for (const i of titres) expect(String(lignes[i][0]).length).toBeGreaterThan(0);
  });
});

describe("contenuOngletActivite", () => {
  it("cite les types toujours payés", () => {
    const { lignes } = contenuOngletActivite(["Remplacement"]);
    expect(lignes.flat()).toContain("• les activités de type : Remplacement ;");
  });

  it("le dit clairement s'il n'y en a aucun", () => {
    const { lignes } = contenuOngletActivite([]);
    expect(lignes.flat().some((c) => String(c).includes("aucun type d'activité"))).toBe(true);
  });
});
