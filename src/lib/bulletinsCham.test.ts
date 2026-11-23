import { describe, expect, it } from "vitest";
import { calendrierParDefaut, campagneOuverte, decouperLignes, erreurCalendrier, lireSignature, periodeCourante, rappelDuJour } from "./bulletinsCham";

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

describe("calendrier modifié", () => {
  const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
  const calendrier = () => {
    const c = calendrierParDefaut(2026);
    c[2] = { ouverture: jour("2027-02-01"), relance: jour("2027-02-10") };
    return c;
  };

  it("suit les dates choisies pour le trimestre et les rappels", () => {
    const c = calendrier();
    expect(periodeCourante(d("2027-01-31"), c).trimestre).toBe(1);
    expect(periodeCourante(d("2027-02-01"), c).trimestre).toBe(2);
    expect(campagneOuverte(d("2027-02-01"), 2026, 2, c)).toBe(true);
    expect(rappelDuJour(d("2027-01-31"), c)).toBeNull();
    expect(rappelDuJour(d("2027-02-01"), c)).toEqual({ anneeDebut: 2026, trimestre: 2, type: "OUVERTURE" });
    expect(rappelDuJour(d("2027-02-10"), c)).toEqual({ anneeDebut: 2026, trimestre: 2, type: "RELANCE" });
    expect(rappelDuJour(d("2027-02-17"), c)).toBeNull();
  });

  it("donne priorité à l'annonce du trimestre suivant", () => {
    const c = calendrierParDefaut(2026);
    c[2] = { ouverture: jour("2027-02-15"), relance: jour("2027-05-10") };
    c[3] = { ouverture: jour("2027-05-12"), relance: jour("2027-05-20") };
    expect(rappelDuJour(d("2027-05-12"), c)).toEqual({ anneeDebut: 2026, trimestre: 3, type: "OUVERTURE" });
  });

  const verifier = (c: ReturnType<typeof calendrier>, envoyes: string[] = ["1-OUVERTURE", "1-RELANCE"]) =>
    erreurCalendrier({ anneeDebut: 2026, calendrier: c, avant: calendrierParDefaut(2026), envoyes: new Set(envoyes), aujourdHui: d("2026-11-23") });

  it("accepte des dates à venir cohérentes", () => {
    expect(verifier(calendrier())).toBeNull();
    expect(verifier(calendrierParDefaut(2026))).toBeNull();
  });

  it("refuse une relance avant l'annonce, un ordre incohérent ou une date hors de l'année", () => {
    const a = calendrier();
    a[2].relance = jour("2027-01-20");
    expect(verifier(a)).toContain("relance doit être après");
    const b = calendrier();
    b[2].ouverture = jour("2026-11-19");
    expect(verifier(b)).toContain("doit être après la relance");
    const e = calendrier();
    e[3] = { ouverture: jour("2027-08-30"), relance: jour("2027-09-02") };
    expect(verifier(e)).toContain("année scolaire");
  });

  it("refuse de déplacer un rappel à aujourd'hui ou avant : rien ne part par surprise", () => {
    const c = calendrierParDefaut(2026);
    c[1] = { ouverture: jour("2026-11-23"), relance: jour("2026-11-30") };
    expect(verifier(c, [])).toContain("à partir de demain");
    const demain = calendrierParDefaut(2026);
    demain[1] = { ouverture: jour("2026-11-24"), relance: jour("2026-11-30") };
    expect(verifier(demain, [])).toBeNull();
  });
});
