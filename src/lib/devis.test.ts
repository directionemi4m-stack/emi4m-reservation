import { describe, expect, it } from "vitest";
import { aRelancer, etatDevis, euros, lireCentimes, lireLignes, nomFichierDocument, prochainNumero, totalDocument } from "./devis";

const jour = (j: string) => new Date(`${j}T00:00:00.000Z`);

describe("devis et factures", () => {
  it("numérote sans trou, par année", () => {
    expect(prochainNumero("D", 2026, [])).toBe("D-2026-001");
    expect(prochainNumero("D", 2026, ["D-2026-001", "D-2026-007", "D-2025-012", "F-2026-020"])).toBe("D-2026-008");
    expect(prochainNumero("F", 2027, ["F-2026-020"])).toBe("F-2027-001");
  });

  it("lit les montants et calcule les totaux", () => {
    expect(lireCentimes("49,80")).toBe(4980);
    expect(lireCentimes("1 250")).toBe(125000);
    expect(lireCentimes("abc")).toBeNull();
    expect(totalDocument([{ quantite: 1.5, prixUnitaireCentimes: 4500 }, { quantite: 2, prixUnitaireCentimes: 1000 }])).toBe(8750);
    expect(euros(123450)).toMatch(/^1\s?234,50 €$/);
  });

  it("lit les lignes du formulaire et signale les erreurs", () => {
    const r = lireLignes({
      designations: ["Intervention en milieu scolaire", "", "Concert"],
      quantites: ["10", "", ""],
      unites: ["heure", "", "forfait"],
      prix: ["45", "", "600,00"],
    });
    expect(r).toEqual({
      lignes: [
        { designation: "Intervention en milieu scolaire", quantite: 10, unite: "heure", prixUnitaireCentimes: 4500 },
        { designation: "Concert", quantite: 1, unite: "forfait", prixUnitaireCentimes: 60000 },
      ],
    });
    expect(lireLignes({ designations: [""], quantites: [""], unites: [""], prix: [""] })).toHaveProperty("erreur");
    expect(lireLignes({ designations: ["Concert"], quantites: ["deux"], unites: [""], prix: ["10"] })).toHaveProperty("erreur");
  });

  it("dit si un devis est expiré ou à relancer", () => {
    const auj = jour("2026-12-20");
    expect(etatDevis("ENVOYE", jour("2026-12-19"), auj)).toBe("EXPIRE");
    expect(etatDevis("ENVOYE", jour("2026-12-20"), auj)).toBe("ENVOYE");
    expect(etatDevis("ACCEPTE", jour("2026-01-01"), auj)).toBe("ACCEPTE");
    expect(aRelancer("ENVOYE", jour("2026-12-01"), jour("2027-01-10"), auj)).toBe(true);
    expect(aRelancer("ENVOYE", jour("2026-12-10"), jour("2027-01-10"), auj)).toBe(false);
  });

  it("nomme les fichiers", () => {
    expect(nomFichierDocument("D-2026-001", "Mairie de Lans / Vercors")).toBe("D-2026-001 Mairie de Lans Vercors.pdf");
    expect(nomFichierDocument("D-2026-001", "IME", " - signé")).toBe("D-2026-001 IME - signé.pdf");
  });
});
