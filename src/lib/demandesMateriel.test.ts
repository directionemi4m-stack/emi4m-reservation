import { describe, expect, it } from "vitest";
import { cellulePropositions, coutDemande, lireLien, nomSite, peutModifierDemande, trierDemandes, trierPourTableau } from "./demandesMateriel";

describe("lireLien", () => {
  it("complète une adresse collée sans https", () => {
    expect(lireLien("thomann.de/fr/pupitre.htm")).toBe("https://thomann.de/fr/pupitre.htm");
    expect(lireLien("  https://www.woodbrass.com/a?b=1 ")).toBe("https://www.woodbrass.com/a?b=1");
  });
  it("refuse ce qui n'est pas un lien web", () => {
    expect(lireLien("javascript:alert(1)")).toBeNull();
    expect(lireLien("data:text/html,x")).toBeNull();
    expect(lireLien("ftp://exemple.fr/x")).toBeNull();
    expect(lireLien("un pupitre")).toBeNull();
    expect(lireLien("pupitre")).toBeNull();
    expect(lireLien("https://moi:secret@exemple.fr")).toBeNull();
    expect(lireLien("")).toBeNull();
  });
});

describe("nomSite", () => {
  it("garde le nom du site", () => {
    expect(nomSite("https://www.thomann.de/fr/x.htm")).toBe("thomann.de");
  });
});

describe("coutDemande", () => {
  it("prend la proposition retenue, multipliée par la quantité", () => {
    expect(coutDemande(3, [{ prixCentimes: 1000, retenue: false }, { prixCentimes: 2500, retenue: true }])).toEqual({ centimes: 7500, retenue: true });
  });
  it("sinon la moins chère, à titre d'estimation", () => {
    expect(coutDemande(2, [{ prixCentimes: 3000, retenue: false }, { prixCentimes: null, retenue: false }, { prixCentimes: 1000, retenue: false }])).toEqual({ centimes: 2000, retenue: false });
  });
  it("rien sans prix", () => {
    expect(coutDemande(2, [{ prixCentimes: null, retenue: true }])).toBeNull();
  });
});

describe("trierDemandes", () => {
  it("met les urgentes d'abord, puis les plus anciennes", () => {
    const d = (urgence: "URGENTE" | "NORMALE" | "BASSE", jour: number) => ({ urgence, creeLe: new Date(Date.UTC(2026, 10, jour)) });
    const r = trierDemandes([d("BASSE", 1), d("URGENTE", 9), d("NORMALE", 2), d("URGENTE", 3)]);
    expect(r.map((x) => `${x.urgence}${x.creeLe.getUTCDate()}`)).toEqual(["URGENTE3", "URGENTE9", "NORMALE2", "BASSE1"]);
  });
});

describe("peutModifierDemande", () => {
  const d = { auteurId: "moi", statut: "NOUVELLE" as const };
  it("réserve la modification à l'auteur, tant que rien n'est décidé", () => {
    expect(peutModifierDemande({ id: "moi" }, d)).toBe(true);
    expect(peutModifierDemande({ id: "moi" }, { ...d, statut: "A_L_ETUDE" })).toBe(true);
    expect(peutModifierDemande({ id: "moi" }, { ...d, statut: "COMMANDEE" })).toBe(false);
  });
  it("refuse un collègue, et la direction connectée à la place du prof", () => {
    expect(peutModifierDemande({ id: "autre" }, d)).toBe(false);
    expect(peutModifierDemande({ id: "moi", impersonation: { direction: "x" } }, d)).toBe(false);
    expect(peutModifierDemande({ id: "moi" }, { ...d, auteurId: null })).toBe(false);
  });
});

describe("trierPourTableau", () => {
  it("met les demandes en cours en tête, les plus urgentes d'abord", () => {
    const l = (urgence: "URGENTE" | "BASSE", statut: "NOUVELLE" | "COMMANDEE" | "RECUE") => ({ urgence, statut, creeLe: new Date(0) });
    expect(trierPourTableau([l("URGENTE", "RECUE"), l("BASSE", "NOUVELLE"), l("URGENTE", "COMMANDEE"), l("URGENTE", "NOUVELLE")]).map((x) => `${x.urgence} ${x.statut}`)).toEqual([
      "URGENTE NOUVELLE",
      "BASSE NOUVELLE",
      "URGENTE COMMANDEE",
      "URGENTE RECUE",
    ]);
  });
});

describe("cellulePropositions", () => {
  it("place chaque lien sur le nom de son site", () => {
    const r = cellulePropositions(
      [
        { libelle: "port en plus", url: "https://www.exemple.fr/a", prixCentimes: 1950, retenue: true },
        { libelle: "Magasin de Grenoble", url: null, prixCentimes: null, retenue: false },
        { libelle: null, url: "https://autre.org/b", prixCentimes: 500, retenue: false },
      ],
      (c) => `${c / 100} €`
    );
    expect(r.texte).toBe("✓ exemple.fr (port en plus) : 19.5 €\nMagasin de Grenoble\nautre.org : 5 €");
    expect(r.liens.map((l) => r.texte.slice(l.debut, l.fin))).toEqual(["exemple.fr", "autre.org"]);
  });
});
