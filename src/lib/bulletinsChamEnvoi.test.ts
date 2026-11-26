import { describe, expect, it } from "vitest";
import { adresseValide, contenuMailBulletin, rangementBulletin } from "./bulletinsCham";

describe("adresseValide", () => {
  it("accepte une seule adresse", () => {
    expect(adresseValide("famille.martin@exemple.fr")).toBe(true);
    expect(adresseValide("  famille@exemple.fr ")).toBe(true);
  });
  it("refuse le reste", () => {
    for (const a of ["", "famille", "famille@exemple", "a@b.fr, c@d.fr", "a@b.fr;c@d.fr", "a b@c.fr", "Nom <a@b.fr>", "a@b.fr\nBcc:c@d.fr"]) {
      expect(adresseValide(a)).toBe(false);
    }
  });
});

describe("contenuMailBulletin", () => {
  it("prépare l'objet, le texte et le nom de la pièce jointe", () => {
    const c = contenuMailBulletin({ prenom: "Léa", nom: "Martin" }, 2026, 1);
    expect(c.sujet).toContain("Léa MARTIN");
    expect(c.sujet).toContain("2026/2027");
    expect(c.paragraphes.join(" ")).toContain("bulletin de la classe CHAM de Léa MARTIN");
    expect(c.nomFichier).toBe("Bulletin CHAM T1 2026-2027 - MARTIN Léa.pdf");
    expect(contenuMailBulletin({ prenom: "Léa", nom: "Martin", classe: "5B" }, 2026, 1).nomFichier).toBe(
      "Bulletin CHAM T1 2026-2027 - 5B - MARTIN Léa.pdf"
    );
  });

  it("range le bulletin dans le dossier de son niveau, classe en tête du nom", () => {
    expect(rangementBulletin({ prenom: "Léa", nom: "Martin", classe: "5B" }, 2026, 1)).toEqual({
      dossiers: ["Bulletins 2026-2027", "1er trimestre", "5e"],
      nomFichier: "5B — MARTIN Léa — bulletin CHAM T1.pdf",
    });
    expect(rangementBulletin({ prenom: "Noam", nom: "Pascal", classe: "3e" }, 2026, 1).dossiers).toEqual(["Bulletins 2026-2027", "1er trimestre", "3e"]);
    expect(rangementBulletin({ prenom: "Léa", nom: "Martin" }, 2026, 2)).toEqual({
      dossiers: ["Bulletins 2026-2027", "2e trimestre"],
      nomFichier: "MARTIN Léa — bulletin CHAM T2.pdf",
    });
  });
});
