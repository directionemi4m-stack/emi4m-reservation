import { describe, expect, it } from "vitest";
import { coutDemande, lireLien, nomSite, trierDemandes } from "./demandesMateriel";

describe("lireLien", () => {
  it("complète une adresse collée sans https", () => {
    expect(lireLien("thomann.de/fr/pupitre.htm")).toBe("https://thomann.de/fr/pupitre.htm");
    expect(lireLien("  https://www.woodbrass.com/a?b=1 ")).toBe("https://www.woodbrass.com/a?b=1");
  });
  it("refuse ce qui n'est pas un lien web", () => {
    expect(lireLien("javascript:alert(1)")).toBeNull();
    expect(lireLien("data:text/html,x")).toBeNull();
    expect(lireLien("ftp://exemple.fr/x")).toBeNull();
    expect(lireLien("un pupitre")).toBeNull();
    expect(lireLien("pupitre")).toBeNull();
    expect(lireLien("https://moi:secret@exemple.fr")).toBeNull();
    expect(lireLien("")).toBeNull();
  });
});

describe("nomSite", () => {
  it("garde le nom du site", () => {
    expect(nomSite("https://www.thomann.de/fr/x.htm")).toBe("thomann.de");
  });
});

describe("coutDemande", () => {
  it("prend la proposition retenue, multipliée par la quantité", () => {
    expect(coutDemande(3, [{ prixCentimes: 1000, retenue: false }, { prixCentimes: 2500, retenue: true }])).toEqual({ centimes: 7500, retenue: true });
  });
  it("sinon la moins chère, à titre d'estimation", () => {
    expect(coutDemande(2, [{ prixCentimes: 3000, retenue: false }, { prixCentimes: null, retenue: false }, { prixCentimes: 1000, retenue: false }])).toEqual({ centimes: 2000, retenue: false });
  });
  it("rien sans prix", () => {
    expect(coutDemande(2, [{ prixCentimes: null, retenue: true }])).toBeNull();
  });
});

describe("trierDemandes", () => {
  it("met les urgentes d'abord, puis les plus anciennes", () => {
    const d = (urgence: "URGENTE" | "NORMALE" | "BASSE", jour: number) => ({ urgence, creeLe: new Date(Date.UTC(2026, 10, jour)) });
    const r = trierDemandes([d("BASSE", 1), d("URGENTE", 9), d("NORMALE", 2), d("URGENTE", 3)]);
    expect(r.map((x) => `${x.urgence}${x.creeLe.getUTCDate()}`)).toEqual(["URGENTE3", "URGENTE9", "NORMALE2", "BASSE1"]);
  });
});
