import { describe, expect, it } from "vitest";
import { appelAFaire, appelEnRetard, libelleSeance } from "./appels";

const jour = (j: number) => new Date(Date.UTC(2026, 10, j));
const auj = jour(25);

describe("appels oubliés", () => {
  it("une séance d'hier sans appel est à faire, mais pas encore en retard", () => {
    expect(appelAFaire({ date: jour(24), aUnAppel: false }, auj)).toBe(true);
    expect(appelEnRetard({ date: jour(24), aUnAppel: false }, auj)).toBe(false);
  });

  it("en retard à partir du 3e jour, et plus réclamée au-delà de 3 semaines", () => {
    expect(appelEnRetard({ date: jour(22), aUnAppel: false }, auj)).toBe(true);
    expect(appelEnRetard({ date: jour(4), aUnAppel: false }, auj)).toBe(true);
    expect(appelAFaire({ date: jour(3), aUnAppel: false }, auj)).toBe(false);
  });

  it("ni aujourd'hui, ni une séance qui a son appel ou l'absence du prof", () => {
    expect(appelAFaire({ date: auj, aUnAppel: false }, auj)).toBe(false);
    expect(appelAFaire({ date: jour(20), aUnAppel: true }, auj)).toBe(false);
  });

  it("nomme la séance", () => {
    expect(libelleSeance("Violon", jour(3))).toBe("Violon du mardi 3 novembre");
  });
});
