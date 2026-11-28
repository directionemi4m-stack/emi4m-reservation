import { describe, expect, it } from "vitest";
import { infosManquantes, nomFichierDeclaration, representationsADeclarer } from "./declarationSacem";

const jour = (t: string) => new Date(`${t}T00:00:00.000Z`);

describe("representationsADeclarer", () => {
  const aujourdHui = jour("2026-12-13");
  const e = (date: string, extra: Partial<{ sacemEnvoyeeLe: Date; nbPassages: number }> = {}) => ({
    id: date,
    date: jour(date),
    sacemEnvoyeeLe: extra.sacemEnvoyeeLe ?? null,
    nbPassages: extra.nbPassages ?? 3,
  });

  it("déclare le lendemain du concert", () => {
    expect(representationsADeclarer([e("2026-12-12")], aujourdHui)).toHaveLength(1);
    expect(representationsADeclarer([e("2026-12-13"), e("2026-12-20")], aujourdHui)).toHaveLength(0);
  });

  it("une seule fois, et seulement avec un programme", () => {
    expect(representationsADeclarer([e("2026-12-12", { sacemEnvoyeeLe: new Date() })], aujourdHui)).toHaveLength(0);
    expect(representationsADeclarer([e("2026-12-12", { nbPassages: 0 })], aujourdHui)).toHaveLength(0);
  });

  it("rattrape un programme saisi en retard, dans les 10 jours", () => {
    expect(representationsADeclarer([e("2026-12-03")], aujourdHui)).toHaveLength(1);
    expect(representationsADeclarer([e("2026-12-02")], aujourdHui)).toHaveLength(0);
  });
});

describe("nomFichierDeclaration", () => {
  it("met la date du concert en tête du nom", () => {
    expect(nomFichierDeclaration({ date: jour("2026-12-12"), titre: "Concert de Noël" })).toBe("2026-12-12 Concert de Noël - déclaration SACEM.pdf");
    expect(nomFichierDeclaration({ date: jour("2027-03-05"), titre: "Heure musicale : piano/violon" })).toBe(
      "2027-03-05 Heure musicale piano violon - déclaration SACEM.pdf"
    );
  });
});

describe("infosManquantes", () => {
  const base = { entreePayante: false, tarifs: null, entrees: 80, jauge: 120, recettesCentimes: null, recettesAnnexesCentimes: null, depensesCentimes: 0 };
  it("entrée gratuite : spectateurs, jauge et dépenses suffisent", () => {
    expect(infosManquantes(base)).toEqual([]);
    expect(infosManquantes({ ...base, entrees: null, depensesCentimes: null })).toEqual(["nombre de spectateurs", "budget des dépenses"]);
  });
  it("entrée payante : prix et recettes en plus", () => {
    expect(infosManquantes({ ...base, entreePayante: true })).toEqual(["prix des places", "recettes de billetterie"]);
  });
});
