import { describe, expect, it } from "vitest";
import { aujourdHuiUTC, lireDate, nomFichierConvention, saisonDe, salleDuLieu, conventionsARappeler } from "./conventions";

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

describe("conventionsARappeler", () => {
  const j = (s: string) => new Date(`${s}T00:00:00Z`);
  const base = { demandeMairieLe: null, reponseMairieLe: null, fichierUrl: null, rappelLe: null, active: true };
  const aujourdHui = j("2026-11-20");

  it("signale un scan manquant dans les 3 semaines avant l'événement", () => {
    const r = conventionsARappeler(
      [
        { ...base, id: "proche", date: j("2026-12-10") },
        { ...base, id: "loin", date: j("2027-01-20") },
        { ...base, id: "archivee", date: j("2026-12-01"), fichierUrl: "x" },
        { ...base, id: "annulee", date: j("2026-12-01"), active: false },
        { ...base, id: "passee", date: j("2026-11-19") },
      ],
      aujourdHui
    );
    expect(r.sansScan.map((c) => c.id)).toEqual(["proche"]);
  });

  it("signale une mairie sans réponse depuis 10 jours", () => {
    const r = conventionsARappeler(
      [
        { ...base, id: "relancer", date: j("2027-03-01"), demandeMairieLe: j("2026-11-05") },
        { ...base, id: "recente", date: j("2027-03-01"), demandeMairieLe: j("2026-11-15") },
        { ...base, id: "repondue", date: j("2027-03-01"), demandeMairieLe: j("2026-11-01"), reponseMairieLe: j("2026-11-08") },
      ],
      aujourdHui
    );
    expect(r.sansReponse.map((c) => c.id)).toEqual(["relancer"]);
  });

  it("ne rappelle pas deux fois dans la même semaine", () => {
    const c = { ...base, id: "a", date: j("2026-12-01") };
    expect(conventionsARappeler([{ ...c, rappelLe: j("2026-11-17") }], aujourdHui).sansScan).toHaveLength(0);
    expect(conventionsARappeler([{ ...c, rappelLe: j("2026-11-13") }], aujourdHui).sansScan).toHaveLength(1);
  });
});
