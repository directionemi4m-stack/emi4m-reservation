import { describe, expect, it } from "vitest";
import { ajouterJours, jourEnum, lireParamDate, lundiDe, versParamDate } from "./planning";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("jourEnum", () => {
  it("reconnaît chaque jour de la semaine (2026-09-14 = lundi)", () => {
    expect(jourEnum(d("2026-09-14"))).toBe("LUNDI");
    expect(jourEnum(d("2026-09-15"))).toBe("MARDI");
    expect(jourEnum(d("2026-09-18"))).toBe("VENDREDI");
    expect(jourEnum(d("2026-09-20"))).toBe("DIMANCHE");
  });
});

describe("lundiDe", () => {
  it("renvoie la même date pour un lundi", () => {
    expect(lundiDe(d("2026-09-14")).toISOString()).toBe(d("2026-09-14").toISOString());
  });

  it("recule jusqu'au lundi de la semaine pour les autres jours", () => {
    expect(lundiDe(d("2026-09-18")).toISOString()).toBe(d("2026-09-14").toISOString());
    expect(lundiDe(d("2026-09-20")).toISOString()).toBe(d("2026-09-14").toISOString()); // dimanche
  });
});

describe("ajouterJours", () => {
  it("avance du bon nombre de jours, y compris à cheval sur un changement de mois", () => {
    expect(ajouterJours(d("2026-09-28"), 7).toISOString()).toBe(d("2026-10-05").toISOString());
  });

  it("accepte un nombre négatif pour reculer", () => {
    expect(ajouterJours(d("2026-09-21"), -3).toISOString()).toBe(d("2026-09-18").toISOString());
  });
});

describe("versParamDate / lireParamDate", () => {
  it("fait un aller-retour fidèle", () => {
    const original = d("2026-09-18");
    expect(lireParamDate(versParamDate(original))?.toISOString()).toBe(original.toISOString());
  });

  it("rejette un texte qui n'est pas une vraie date", () => {
    expect(lireParamDate("pas-une-date")).toBeNull();
    expect(lireParamDate("2026-13-40")).toBeNull();
    expect(lireParamDate(undefined)).toBeNull();
  });
});
