import { describe, expect, it } from "vitest";
import { messageRappel, rappelsAEnvoyer, type EvenementARappeler } from "./rappelsEvenements";

const evt = (id: string, date: string, extra: Partial<EvenementARappeler> = {}): EvenementARappeler => ({
  id,
  titre: `Concert ${id}`,
  date: new Date(`${date}T00:00:00.000Z`),
  heureDebutMinutes: null,
  lieuNom: null,
  lieuPrecis: null,
  rappelMaterielPour: null,
  rappelClesPour: null,
  ...extra,
});

describe("rappelsAEnvoyer", () => {
  it("matériel 2 jours avant, clés la veille, rien d'autre", () => {
    const r = rappelsAEnvoyer([evt("a", "2026-12-01"), evt("b", "2026-12-02"), evt("c", "2026-12-03"), evt("d", "2026-11-30")], "2026-11-30");
    expect(r.map((x) => `${x.genre}:${x.evenement.id}`)).toEqual(["materiel:b", "cles:a"]);
  });

  it("passe le changement de mois et d'année", () => {
    expect(rappelsAEnvoyer([evt("a", "2027-01-01")], "2026-12-30").map((x) => x.genre)).toEqual(["materiel"]);
    expect(rappelsAEnvoyer([evt("a", "2027-01-01")], "2026-12-31").map((x) => x.genre)).toEqual(["cles"]);
  });

  it("n'envoie pas deux fois pour la même date, mais repart si l'événement a changé de date", () => {
    const deja = new Date("2026-12-02T00:00:00.000Z");
    expect(rappelsAEnvoyer([evt("a", "2026-12-02", { rappelMaterielPour: deja })], "2026-11-30")).toEqual([]);
    const ancien = new Date("2026-11-25T00:00:00.000Z");
    expect(rappelsAEnvoyer([evt("a", "2026-12-02", { rappelMaterielPour: ancien })], "2026-11-30")).toHaveLength(1);
  });
});

describe("messageRappel", () => {
  const e = evt("x", "2026-12-12", { titre: "AG", heureDebutMinutes: 19 * 60, lieuNom: "Villard-de-Lans", lieuPrecis: "Verrière" });

  it("clés : demain, heure et lieu", () => {
    expect(messageRappel(e, "cles")).toEqual({
      titre: "Clés à récupérer",
      corps: "Demain : AG à 19h00 (Villard-de-Lans · Verrière). Pensez à aller chercher les clés.",
      url: "/saison/x",
    });
  });

  it("matériel : le jour en toutes lettres", () => {
    expect(messageRappel(e, "materiel").corps).toBe("Dans 2 jours, samedi 12 décembre : AG à 19h00 (Villard-de-Lans · Verrière). Préparez le matériel.");
    expect(messageRappel(evt("y", "2026-12-18", { titre: "Soirée cordes" }), "materiel").corps).toBe("Dans 2 jours, vendredi 18 décembre : Soirée cordes. Préparez le matériel.");
  });
});
