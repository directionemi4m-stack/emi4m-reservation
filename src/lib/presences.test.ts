import { describe, expect, it } from "vitest";
import { genererDatesSeances, premiereOccurrence, seanceLaPlusProche } from "./presences";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const jourSemaineFr = (date: Date) =>
  date.toLocaleDateString("fr-FR", { weekday: "long", timeZone: "UTC" });

describe("premiereOccurrence", () => {
  it("renvoie la même date si elle tombe déjà sur le bon jour", () => {
    // 2026-09-18 est un vendredi.
    expect(premiereOccurrence("VENDREDI", d("2026-09-18")).toISOString()).toBe(
      d("2026-09-18").toISOString()
    );
  });

  it("avance jusqu'au prochain vendredi quand on part d'un lundi (bug réel de sept. 2026)", () => {
    // C'est exactement le scénario qui a généré 30 séances un lundi au lieu d'un
    // vendredi : la classe a été créée un lundi 21/09 sans changer la date.
    const resultat = premiereOccurrence("VENDREDI", d("2026-09-21"));
    expect(resultat.toISOString()).toBe(d("2026-09-25").toISOString());
    expect(jourSemaineFr(resultat)).toBe("vendredi");
  });

  it("couvre les 7 jours de la semaine sans décalage", () => {
    const jours = [
      ["LUNDI", "lundi"],
      ["MARDI", "mardi"],
      ["MERCREDI", "mercredi"],
      ["JEUDI", "jeudi"],
      ["VENDREDI", "vendredi"],
      ["SAMEDI", "samedi"],
      ["DIMANCHE", "dimanche"],
    ] as const;
    // 2026-09-14 est un lundi.
    for (const [enumVal, libelleAttendu] of jours) {
      const resultat = premiereOccurrence(enumVal, d("2026-09-14"));
      expect(jourSemaineFr(resultat)).toBe(libelleAttendu);
      expect(resultat.getTime()).toBeGreaterThanOrEqual(d("2026-09-14").getTime());
    }
  });
});

describe("genererDatesSeances", () => {
  it("génère N dates, toutes sur le même jour de la semaine que dateDebut", () => {
    const dates = genererDatesSeances(d("2026-09-18"), [], 10);
    expect(dates).toHaveLength(10);
    for (const date of dates) {
      expect(jourSemaineFr(date)).toBe("vendredi");
    }
  });

  it("espace chaque date d'exactement 7 jours quand aucune vacance n'intervient", () => {
    const dates = genererDatesSeances(d("2026-09-18"), [], 5);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i].getTime() - dates[i - 1].getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    }
  });

  it("saute les semaines qui tombent dans une période de vacances", () => {
    // Toussaint 2026 : du 17/10 (inclus) au 02/11 (exclu, reprise).
    const vacances = [{ debut: d("2026-10-17"), fin: d("2026-11-02") }];
    const dates = genererDatesSeances(d("2026-09-18"), vacances, 8);
    const isoDates = dates.map((date) => date.toISOString().slice(0, 10));
    expect(isoDates).not.toContain("2026-10-23"); // vendredi pendant les vacances
    expect(isoDates).not.toContain("2026-10-30"); // idem
    expect(isoDates).toContain("2026-11-06"); // 1er vendredi après la reprise
  });

  it("inclut la date de début elle-même", () => {
    const dates = genererDatesSeances(d("2026-09-18"), [], 1);
    expect(dates[0].toISOString()).toBe(d("2026-09-18").toISOString());
  });
});

describe("seanceLaPlusProche", () => {
  it("renvoie null pour une liste vide", () => {
    expect(seanceLaPlusProche([])).toBeNull();
  });

  it("préfère la prochaine séance à venir plutôt que la plus proche dans le passé", () => {
    const hier = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const dansDeuxJours = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const dansDixJours = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const resultat = seanceLaPlusProche([
      { id: "hier", date: hier },
      { id: "proche", date: dansDeuxJours },
      { id: "loin", date: dansDixJours },
    ]);
    expect(resultat).toBe("proche");
  });

  it("retombe sur la séance passée la plus proche s'il n'y en a aucune à venir", () => {
    const ancienne = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    const recente = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const resultat = seanceLaPlusProche([
      { id: "ancienne", date: ancienne },
      { id: "recente", date: recente },
    ]);
    expect(resultat).toBe("recente");
  });
});
