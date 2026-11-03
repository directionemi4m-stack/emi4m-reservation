import { describe, expect, it } from "vitest";
import { MODELE_MAIRIE_DEFAUT, remplirModele } from "./modeleMairie";

const valeurs = { salle: "Lodéon", commune: "Villard-de-Lans", date: "samedi 19 décembre", debut: "18:00", fin: "20:00" };

describe("remplirModele", () => {
  it("remplace les variables du message type", () => {
    expect(remplirModele(MODELE_MAIRIE_DEFAUT.sujet, valeurs)).toBe(
      "Demande de réservation de salle — Lodéon (Villard-de-Lans) — samedi 19 décembre"
    );
    expect(remplirModele(MODELE_MAIRIE_DEFAUT.corps, valeurs)).toContain("samedi 19 décembre, de 18:00 à 20:00");
  });

  it("laisse une variable inconnue telle quelle et accepte les répétitions", () => {
    expect(remplirModele("{salle} {salle} {inconnue}", valeurs)).toBe("Lodéon Lodéon {inconnue}");
  });
});
