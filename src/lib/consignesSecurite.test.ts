import { describe, expect, it } from "vitest";
import { ecrireContact, lignes, lireContact, numeros } from "./consignesSecurite";

describe("lireContact / ecrireContact", () => {
  it("sépare libellé et numéro sur le dernier « : »", () => {
    expect(lireContact("La direction : 06 95 85 91 77")).toEqual({
      libelle: "La direction",
      telephone: "06 95 85 91 77",
    });
  });

  it("fait un aller-retour fidèle", () => {
    const c = { libelle: "Mairie de Villard-de-Lans", telephone: "04 76 94 50 00" };
    expect(lireContact(ecrireContact(c))).toEqual(c);
  });

  it("garde une ligne sans numéro comme simple libellé", () => {
    expect(lireContact("Le gardien")).toEqual({ libelle: "Le gardien", telephone: "" });
  });
});

describe("numeros", () => {
  it("découpe les numéros d'urgence alternatifs", () => {
    expect(numeros("18 ou 112")).toEqual(["18", "112"]);
    expect(numeros("06 95 85 91 77")).toEqual(["06 95 85 91 77"]);
  });
});

describe("lignes", () => {
  it("ignore les lignes vides et les espaces", () => {
    expect(lignes("  Le directeur \n\n Le secrétariat\r\n")).toEqual(["Le directeur", "Le secrétariat"]);
  });
});
