import { describe, expect, it } from "vitest";
import {
  chevauchement,
  formaterDuree,
  heuresDecimales,
  heureVersMinutes,
  memeCommune,
  minutesVersHeure,
  volumeHebdoMinutes,
} from "./agenda";

const cours = (jour: string, debut: string, duree: number, uneSemaineSurDeux = false) => ({
  jourSemaine: jour,
  heureDebutMinutes: heureVersMinutes(debut)!,
  dureeMinutes: duree,
  uneSemaineSurDeux,
});

describe("heureVersMinutes / minutesVersHeure", () => {
  it("convertit dans les deux sens", () => {
    expect(heureVersMinutes("14:15")).toBe(855);
    expect(minutesVersHeure(855)).toBe("14h15");
    expect(minutesVersHeure(545, ":")).toBe("09:05");
  });

  it("refuse une heure invalide", () => {
    expect(heureVersMinutes("25:00")).toBeNull();
    expect(heureVersMinutes("14h15")).toBeNull();
  });
});

describe("volumeHebdoMinutes", () => {
  it("additionne les cours hebdomadaires", () => {
    expect(volumeHebdoMinutes([cours("LUNDI", "14:00", 30), cours("LUNDI", "14:30", 45)])).toBe(75);
  });

  it("compte pour moitié un cours une semaine sur deux", () => {
    expect(volumeHebdoMinutes([cours("LUNDI", "14:00", 30, true)])).toBe(15);
    expect(volumeHebdoMinutes([cours("LUNDI", "14:00", 45, true)])).toBe(22.5);
  });

  it("deux élèves qui alternent sur le même créneau font un créneau plein", () => {
    expect(volumeHebdoMinutes([cours("LUNDI", "14:00", 30, true), cours("LUNDI", "14:00", 30, true)])).toBe(30);
  });
});

describe("formaterDuree / heuresDecimales", () => {
  it("formate sans arrondi caché", () => {
    expect(formaterDuree(750)).toBe("12 h 30");
    expect(formaterDuree(720)).toBe("12 h");
    expect(formaterDuree(742.5)).toBe("12 h 22,5");
    expect(formaterDuree(45)).toBe("45 min");
    expect(formaterDuree(22.5)).toBe("22,5 min");
  });

  it("donne des heures décimales exactes", () => {
    expect(heuresDecimales(750)).toBe("12,5");
    expect(heuresDecimales(742.5)).toBe("12,375");
  });
});

describe("memeCommune", () => {
  it("rapproche un lieu de Présences de la commune de ses salles", () => {
    expect(memeCommune("Saint-Nizier", "Saint-Nizier-du-Moucherotte")).toBe(true);
    expect(memeCommune("Méaudre", "Méaudre")).toBe(true);
    expect(memeCommune("Villard-de-Lans", "Villard-de-Lans")).toBe(true);
  });

  it("ne confond pas deux communes différentes", () => {
    expect(memeCommune("Lans-en-Vercors", "Villard-de-Lans")).toBe(false);
    expect(memeCommune("Corrençon", "Autrans")).toBe(false);
  });
});

describe("chevauchement", () => {
  it("détecte deux cours qui se recouvrent le même jour", () => {
    expect(chevauchement(cours("LUNDI", "14:00", 45), cours("LUNDI", "14:30", 30))).toBe(true);
  });

  it("accepte des cours qui se suivent ou des jours différents", () => {
    expect(chevauchement(cours("LUNDI", "14:00", 30), cours("LUNDI", "14:30", 30))).toBe(false);
    expect(chevauchement(cours("LUNDI", "14:00", 30), cours("MARDI", "14:00", 30))).toBe(false);
  });

  it("laisse deux élèves une semaine sur deux alterner sur le même créneau", () => {
    expect(chevauchement(cours("LUNDI", "14:00", 30, true), cours("LUNDI", "14:00", 30, true))).toBe(false);
    expect(chevauchement(cours("LUNDI", "14:00", 30, true), cours("LUNDI", "14:00", 30))).toBe(true);
  });
});
