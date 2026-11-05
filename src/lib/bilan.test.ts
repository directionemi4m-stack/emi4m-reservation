import { describe, expect, it } from "vitest";
import { bilanEnCsv, communeOfficielle, pourcentage, repartition } from "./bilan";

describe("bilan de l'année", () => {
  it("compte et trie les valeurs", () => {
    expect(repartition(["Lans", "Villard", "Lans", "Autrans"])).toEqual([
      { libelle: "Lans", nombre: 2 },
      { libelle: "Autrans", nombre: 1 },
      { libelle: "Villard", nombre: 1 },
    ]);
  });

  it("ramène les communes écrites librement à la commune officielle", () => {
    const nom = (t: string) => communeOfficielle(t).nom;
    expect(nom("St Nizier")).toBe("Saint-Nizier-du-Moucherotte");
    expect(nom("Saint Nizier du Mouchette")).toBe("Saint-Nizier-du-Moucherotte");
    expect(nom("Villard de Lanss")).toBe("Villard-de-Lans");
    expect(nom("Lans-en-Vercors")).toBe("Lans-en-Vercors");
    expect(nom("Méaudre")).toBe("Autrans-Méaudre en Vercors");
    expect(nom("Autrans Meaudre en Vercors (meaudre)")).toBe("Autrans-Méaudre en Vercors");
    expect(nom("Correncon en Vercors")).toBe("Corrençon-en-Vercors");
    expect(nom("Saint Marttin en Vercors")).toBe("Saint-Martin-en-Vercors");
    expect(communeOfficielle("Engins").ccmv).toBe(true);
    expect(communeOfficielle("Grenoble")).toEqual({ nom: "Grenoble", ccmv: false });
    expect(communeOfficielle("")).toEqual({ nom: "Non renseignée", ccmv: null });
  });

  it("arrondit les parts au dixième", () => {
    expect(pourcentage(1, 3)).toBe(33.3);
    expect(pourcentage(0, 0)).toBe(0);
  });

  it("produit un CSV lisible par Excel", () => {
    const csv = bilanEnCsv("Bilan 2026-2027", [
      {
        titre: "Élèves",
        chiffres: [{ libelle: "Élèves", nombre: 3 }],
        tableaux: [{ titre: "Par commune", colonne: "Commune", lignes: [{ libelle: "Saint-Nizier; centre", nombre: 3 }] }],
      },
    ]);
    expect(csv.startsWith("﻿Bilan 2026-2027\r\n")).toBe(true);
    expect(csv).toContain("ÉLÈVES\r\nÉlèves;3\r\n");
    expect(csv).toContain('"Saint-Nizier; centre";3;100 %');
  });
});
