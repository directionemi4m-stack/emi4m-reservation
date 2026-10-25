import { describe, expect, it } from "vitest";
import { bilanForfait, lireHeuresHebdo } from "./forfaitAccessoire";

const act = (duree: string, horsForfait = false, supprime = false) => ({
  duree,
  horsForfait,
  supprimeLe: supprime ? new Date() : null,
});

describe("bilanForfait", () => {
  it("forfait = heures hebdo × 6 : 5 h/semaine → 30 h dues", () => {
    const b = bilanForfait([act("8h00"), act("4h00")], 5 * 60);
    expect(b.forfaitMinutes).toBe(30 * 60);
    expect(b.auForfaitMinutes).toBe(12 * 60);
    expect(b.resteMinutes).toBe(18 * 60);
    expect(b.depassementMinutes).toBe(0);
    expect(b.totalAPayerMinutes).toBe(0);
  });

  it("au-delà du forfait, le dépassement est à payer", () => {
    const b = bilanForfait([act("8h00"), act("8h00"), act("8h00"), act("8h00"), act("1h30")], 5 * 60);
    expect(b.depassementMinutes).toBe(3.5 * 60);
    expect(b.resteMinutes).toBe(0);
    expect(b.totalAPayerMinutes).toBe(3.5 * 60);
  });

  it("les heures hors forfait sont toujours payées et n'entament pas le forfait", () => {
    const b = bilanForfait([act("2h00"), act("1h30", true)], 5 * 60);
    expect(b.auForfaitMinutes).toBe(120);
    expect(b.horsForfaitMinutes).toBe(90);
    expect(b.resteMinutes).toBe(30 * 60 - 120);
    expect(b.totalAPayerMinutes).toBe(90);
  });

  it("ignore les activités supprimées", () => {
    expect(bilanForfait([act("2h00", false, true)], 5 * 60).auForfaitMinutes).toBe(0);
  });

  it("sans heures hebdo saisies, le dépassement et le total restent inconnus", () => {
    const b = bilanForfait([act("1h30", true)], null);
    expect(b.forfaitMinutes).toBeNull();
    expect(b.horsForfaitMinutes).toBe(90);
    expect(b.totalAPayerMinutes).toBeNull();
  });
});

describe("lireHeuresHebdo", () => {
  it("accepte les écritures courantes", () => {
    expect(lireHeuresHebdo("5")).toBe(300);
    expect(lireHeuresHebdo("5,5")).toBe(330);
    expect(lireHeuresHebdo("5.25")).toBe(315);
    expect(lireHeuresHebdo("5h30")).toBe(330);
    expect(lireHeuresHebdo("5 h 30")).toBe(330);
    expect(lireHeuresHebdo("12h")).toBe(720);
  });

  it("refuse une saisie illisible", () => {
    expect(lireHeuresHebdo("")).toBeNull();
    expect(lireHeuresHebdo("cinq")).toBeNull();
    expect(lireHeuresHebdo("5h75")).toBeNull();
  });
});
