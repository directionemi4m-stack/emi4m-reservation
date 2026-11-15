import { describe, expect, it } from "vitest";
import { datesRecurrentes, differenceAgenda, estDisciplineEnsemble, grilleDuMois, moisDeLaSaison } from "./agendaEnsemble";

describe("agenda des ensembles", () => {
  it("reconnaît les disciplines d'ensemble", () => {
    for (const n of ["Chorale primaire", "Orchestre cycle I", "Orchestre cycle II/III", "Ensemble de guitare", "Ensemble Musique Actuelle", "Atelier musiques actuelles"]) {
      expect(estDisciplineEnsemble(n)).toBe(true);
    }
    expect(estDisciplineEnsemble("Piano musique actuelle")).toBe(false);
    expect(estDisciplineEnsemble("Violon")).toBe(false);
  });

  it("donne les mois de septembre à juin et une grille commençant le lundi", () => {
    const mois = moisDeLaSaison(2026);
    expect(mois[0]).toEqual({ annee: 2026, mois: 8 });
    expect(mois[9]).toEqual({ annee: 2027, mois: 5 });
    // 1er novembre 2026 = dimanche : 6 cases vides avant.
    const nov = grilleDuMois(2026, 10);
    expect(nov.slice(0, 7)).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(nov.at(-1)).toBe("2026-11-30");
  });

  it("propose un jour par semaine ou une semaine sur deux, hors vacances et fériés", () => {
    const vacances = [{ debut: "2026-12-19", fin: "2027-01-04" }];
    const chaque = datesRecurrentes({ jourSemaine: 2, du: "2026-11-01", au: "2027-01-20", pas: 1, vacances, feries: ["2026-11-11"] });
    expect(chaque).not.toContain("2026-11-11");
    expect(chaque).not.toContain("2026-12-23");
    expect(chaque.slice(0, 3)).toEqual(["2026-11-04", "2026-11-18", "2026-11-25"]);
    const unSurDeux = datesRecurrentes({ jourSemaine: 2, du: "2026-11-01", au: "2027-01-20", pas: 2, vacances, feries: [] });
    // Les vacances ne décalent pas le rythme : 4/11, 18/11, 2/12, 16/12, puis 13/01 (6/01 sauté).
    expect(unSurDeux).toEqual(["2026-11-04", "2026-11-18", "2026-12-02", "2026-12-16", "2027-01-13"]);
  });

  it("calcule les ajouts et retraits sans jamais retirer une séance verrouillée", () => {
    const r = differenceAgenda(
      [
        { id: "a", date: "2026-11-04", verrouillee: true },
        { id: "b", date: "2026-11-18", verrouillee: false },
        { id: "c", date: "2026-11-25", verrouillee: false },
      ],
      ["2026-11-25", "2026-12-02"]
    );
    expect(r).toEqual({ ajouts: ["2026-12-02"], retraits: ["b"] });
  });
});
