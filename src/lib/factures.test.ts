import { describe, expect, it } from "vitest";
import { devinerFacture, lireNomFacture, nomFichierFacture, normaliserNomFichier } from "./factures";

const aujourdHui = new Date("2026-11-01T10:00:00Z");

describe("nommage", () => {
  it("suit le format année-mois-jour_entreprise", () => {
    expect(nomFichierFacture("2026-10-28", "Thomann")).toBe("2026-10-28_Thomann.pdf");
    expect(nomFichierFacture("2026-10-28", "  Garage  à musique / Grenoble ")).toBe("2026-10-28_Garage à musique Grenoble.pdf");
  });

  it("nettoie un nom saisi à la main et garde l'extension .pdf", () => {
    expect(normaliserNomFichier("2026-10-28_Thomann cordes")).toBe("2026-10-28_Thomann cordes.pdf");
    expect(normaliserNomFichier("facture:1?.PDF")).toBe("facture 1.pdf");
    expect(normaliserNomFichier("  ")).toBe("Facture.pdf");
  });
});

describe("lireNomFacture", () => {
  it("retrouve date et entreprise dans un nom normé", () => {
    expect(lireNomFacture("2026-10-28_Thomann.pdf")).toEqual({ date: "2026-10-28", fournisseur: "Thomann" });
    expect(lireNomFacture("2026-10-28_Garage à musique (2).pdf")).toEqual({ date: "2026-10-28", fournisseur: "Garage à musique (2)" });
    expect(lireNomFacture("2026-10-28_.pdf")).toEqual({ date: "2026-10-28", fournisseur: null });
  });

  it("accepte un nom libre", () => {
    expect(lireNomFacture("Facture cordes Thomann.pdf")).toEqual({ date: null, fournisseur: "Facture cordes Thomann" });
    expect(lireNomFacture("2026-02-31_X.pdf")).toEqual({ date: null, fournisseur: "2026-02-31_X" });
  });
});

describe("devinerFacture", () => {
  it("lit une facture type", () => {
    const texte = `Thomann GmbH
Hans-Thomann-Straße 1
96138 Burgebrach
FACTURE N° 2026104455
Date de facture : 28.10.2026
Échéance : 27.11.2026
Désignation Qté Prix
Cordes violon 4/4 2 24,90
Total HT 41,50
TVA 20 % 8,30
Total TTC 49,80 €`;
    expect(devinerFacture(texte, [], aujourdHui)).toEqual({ date: "2026-10-28", fournisseur: "Thomann GmbH", montantCentimes: 4980 });
  });

  it("préfère une entreprise déjà connue et une date en toutes lettres", () => {
    const texte = `LE GARAGE A MUSIQUE
12 rue des Alpes
Grenoble, le 3 octobre 2026
Net à payer : 1 250,00 €`;
    const r = devinerFacture(texte, ["Garage à musique", "Thomann"], aujourdHui);
    expect(r).toEqual({ date: "2026-10-03", fournisseur: "Garage à musique", montantCentimes: 125000 });
  });

  it("ignore les dates impossibles ou trop lointaines", () => {
    const r = devinerFacture("Commande du 31/02/2026\nLivraison le 15/06/2030\nle 02/09/2026", [], aujourdHui);
    expect(r.date).toBe("2026-09-02");
  });

  it("ne propose rien plutôt que n'importe quoi", () => {
    expect(devinerFacture("", [], aujourdHui)).toEqual({ date: null, fournisseur: null, montantCentimes: null });
  });
});
