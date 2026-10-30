import { describe, expect, it } from "vitest";
import { formaterMinutage, grouperParMois, libelleLieu, lireMinutage, minutageEditable } from "./saison";

describe("lireMinutage", () => {
  it("accepte les écritures courantes d'un minutage", () => {
    expect(lireMinutage("3'30")).toBe(210);
    expect(lireMinutage("3’30")).toBe(210);
    expect(lireMinutage("3:30")).toBe(210);
    expect(lireMinutage("3'30''")).toBe(210);
    expect(lireMinutage("3 min 30")).toBe(210);
    expect(lireMinutage("3 min")).toBe(180);
    expect(lireMinutage("3")).toBe(180);
    expect(lireMinutage("12'05")).toBe(725);
  });

  it("refuse une saisie illisible ou nulle", () => {
    expect(lireMinutage("")).toBeNull();
    expect(lireMinutage("trois minutes")).toBeNull();
    expect(lireMinutage("3'75")).toBeNull();
    expect(lireMinutage("0")).toBeNull();
  });
});

describe("minutageEditable", () => {
  it("se relit à l'identique, y compris au-delà d'une heure", () => {
    for (const s of [30, 210, 725, 3750]) expect(lireMinutage(minutageEditable(s))).toBe(s);
  });
});

describe("formaterMinutage", () => {
  it("affiche minutes et secondes, et les heures au-delà", () => {
    expect(formaterMinutage(210)).toBe("3'30");
    expect(formaterMinutage(725)).toBe("12'05");
    expect(formaterMinutage(3750)).toBe("1 h 02'30");
  });
});

describe("grouperParMois", () => {
  const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
  it("donne les 12 mois de la saison, événements triés par date puis heure", () => {
    const mois = grouperParMois(
      [
        { id: "b", date: d("2026-11-14"), heureDebutMinutes: 1080 },
        { id: "a", date: d("2026-11-14"), heureDebutMinutes: 600 },
        { id: "c", date: d("2027-06-20"), heureDebutMinutes: null },
        { id: "hors", date: d("2027-09-10"), heureDebutMinutes: null },
      ],
      2026
    );
    expect(mois).toHaveLength(12);
    expect(mois[0].libelle).toBe("Septembre 2026");
    expect(mois[11].libelle).toBe("Août 2027");
    expect(mois[2].evenements.map((e) => e.id)).toEqual(["a", "b"]);
    expect(mois[9].evenements.map((e) => e.id)).toEqual(["c"]);
    expect(mois.flatMap((m) => m.evenements).map((e) => e.id)).not.toContain("hors");
  });
});

describe("libelleLieu", () => {
  it("assemble commune et lieu précis", () => {
    expect(libelleLieu("Méaudre", "Église")).toBe("Méaudre · Église");
    expect(libelleLieu(null, "Cinéma")).toBe("Cinéma");
    expect(libelleLieu(null, null)).toBe("");
  });
});
