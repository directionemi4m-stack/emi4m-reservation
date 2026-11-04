import { describe, expect, it } from "vitest";
import { aujourdHuiUTC, lireDate, nomFichierConvention, saisonDe, salleDuLieu } from "./conventions";

describe("saisonDe", () => {
  it("compte la saison de septembre à août", () => {
    expect(saisonDe(new Date("2026-12-19T00:00:00Z"))).toBe("2026-2027");
    expect(saisonDe(new Date("2027-06-30T00:00:00Z"))).toBe("2026-2027");
    expect(saisonDe(new Date("2026-09-01T00:00:00Z"))).toBe("2026-2027");
    expect(saisonDe(new Date("2026-08-31T00:00:00Z"))).toBe("2025-2026");
  });
});

describe("nomFichierConvention", () => {
  it("donne un nom de fichier daté et sans caractère interdit", () => {
    expect(
      nomFichierConvention({ date: new Date("2026-12-19T00:00:00Z"), salle: "La Coupole", commune: "Villard-de-Lans", prof: "Alice O/Neil" })
    ).toBe("2026-12-19 La Coupole (Villard-de-Lans) - Alice O-Neil.pdf");
  });
});

describe("lireDate", () => {
  it("lit une date saisie, refuse une date impossible", () => {
    expect(lireDate("2026-11-04")?.toISOString()).toBe("2026-11-04T00:00:00.000Z");
    expect(lireDate("")).toBeNull();
    expect(lireDate(null)).toBeNull();
    expect(lireDate("2026-02-30")).toBeUndefined();
    expect(lireDate("04/11/2026")).toBeUndefined();
  });
});

describe("aujourdHuiUTC", () => {
  it("prend la date de Paris, même tard le soir", () => {
    expect(aujourdHuiUTC(new Date("2026-11-04T23:30:00Z")).toISOString()).toBe("2026-11-05T00:00:00.000Z");
    expect(aujourdHuiUTC(new Date("2026-11-04T10:00:00Z")).toISOString()).toBe("2026-11-04T00:00:00.000Z");
  });
});

describe("salleDuLieu", () => {
  const salles = [
    { nom: "La Verrière", commune: "Villard-de-Lans" },
    { nom: "Salle des fêtes", commune: "Méaudre" },
    { nom: "Salle des fêtes", commune: "Autrans" },
  ];
  it("reconnaît la salle saisie librement dans l'agenda", () => {
    expect(salleDuLieu("Verrière", "Villard-de-Lans", salles)?.nom).toBe("La Verrière");
    expect(salleDuLieu("LA VERRIERE", null, salles)?.nom).toBe("La Verrière");
    expect(salleDuLieu("Salle des fêtes", "Méaudre", salles)?.commune).toBe("Méaudre");
  });
  it("ne devine pas quand c'est ambigu ou absent", () => {
    expect(salleDuLieu("Salle des fêtes", null, salles)).toBeNull();
    expect(salleDuLieu("Le CAIRN", "Lans-en-Vercors", salles)).toBeNull();
    expect(salleDuLieu(null, "Méaudre", salles)).toBeNull();
  });
});
