import { describe, expect, it } from "vitest";
import { decouperLignes, lireSignature, periodeCourante, rappelDuJour } from "./bulletinsCham";

const d = (iso: string) => new Date(`${iso}T07:00:00.000Z`);

describe("periodeCourante", () => {
  it("suit les 15 novembre, 15 février et 15 mai", () => {
    expect(periodeCourante(d("2026-09-10"))).toEqual({ anneeDebut: 2026, trimestre: 1 });
    expect(periodeCourante(d("2026-11-20"))).toEqual({ anneeDebut: 2026, trimestre: 1 });
    expect(periodeCourante(d("2027-02-14"))).toEqual({ anneeDebut: 2026, trimestre: 1 });
    expect(periodeCourante(d("2027-02-15"))).toEqual({ anneeDebut: 2026, trimestre: 2 });
    expect(periodeCourante(d("2027-05-15"))).toEqual({ anneeDebut: 2026, trimestre: 3 });
    expect(periodeCourante(d("2027-08-31"))).toEqual({ anneeDebut: 2026, trimestre: 3 });
  });
});

describe("rappelDuJour", () => {
  it("annonce le 15 et relance 4 jours après", () => {
    expect(rappelDuJour(d("2026-11-14"))).toBeNull();
    expect(rappelDuJour(d("2026-11-15"))).toEqual({ anneeDebut: 2026, trimestre: 1, type: "OUVERTURE" });
    expect(rappelDuJour(d("2026-11-18"))?.type).toBe("OUVERTURE");
    expect(rappelDuJour(d("2026-11-19"))).toEqual({ anneeDebut: 2026, trimestre: 1, type: "RELANCE" });
    expect(rappelDuJour(d("2027-02-19"))).toEqual({ anneeDebut: 2026, trimestre: 2, type: "RELANCE" });
    expect(rappelDuJour(d("2027-05-15"))).toEqual({ anneeDebut: 2026, trimestre: 3, type: "OUVERTURE" });
  });

  it("ne relance plus une fois la semaine de rattrapage passée", () => {
    expect(rappelDuJour(d("2026-11-26"))).toBeNull();
    expect(rappelDuJour(d("2027-01-10"))).toBeNull();
  });
});

describe("lireSignature", () => {
  it("n'accepte qu'une image PNG", () => {
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200)]);
    expect(lireSignature(`data:image/png;base64,${png.toString("base64")}`)).not.toBeNull();
    expect(lireSignature(`data:image/png;base64,${Buffer.alloc(300).toString("base64")}`)).toBeNull();
    expect(lireSignature("data:text/html;base64,PGh0bWw+")).toBeNull();
    expect(lireSignature("")).toBeNull();
  });
});

describe("decouperLignes", () => {
  const mesure = (t: string) => t.length; // 1 caractère = 1 unité

  it("coupe entre les mots et garde les retours à la ligne", () => {
    expect(decouperLignes("aa bb cc dd", 5, mesure)).toEqual(["aa bb", "cc dd"]);
    expect(decouperLignes("aa\n\nbb", 5, mesure)).toEqual(["aa", "", "bb"]);
  });

  it("coupe un mot trop long", () => {
    expect(decouperLignes("abcdefghij", 4, mesure)).toEqual(["abcd", "efgh", "ij"]);
  });
});
