import { describe, expect, it } from "vitest";
import {
  correspondanceAMemoriser,
  correspondanceProposee,
  devinerChamp,
  extraireEleves,
  filtrerEleves,
  formaterTelephone,
  miseEnFormeCommune,
  trouverLigneEnTetes,
  valeursFiltre,
  cleNomEleve,
  indexAnnuaire,
  nomAffiche,
} from "./annuaireEleves";

describe("devinerChamp", () => {
  it("reconnaît les titres courants", () => {
    expect(devinerChamp("NOM")).toBe("nom");
    expect(devinerChamp("Nom de l'élève")).toBe("nom");
    expect(devinerChamp("Prénom")).toBe("prenom");
    expect(devinerChamp("Nom Prénom")).toBe("nomComplet");
    expect(devinerChamp("Élève")).toBe("nomComplet");
    expect(devinerChamp("Instrument 1")).toBe("instrument");
    expect(devinerChamp("E-mail responsable")).toBe("email");
    expect(devinerChamp("Tél. portable")).toBe("telephone");
    expect(devinerChamp("Ville")).toBe("commune");
  });

  it("ne prend pas le nom d'un responsable pour celui de l'élève", () => {
    expect(devinerChamp("Nom du responsable légal")).toBeNull();
    expect(devinerChamp("Date de naissance")).toBeNull();
    expect(devinerChamp("")).toBeNull();
  });
});

describe("trouverLigneEnTetes", () => {
  it("saute un titre au-dessus du tableau", () => {
    expect(trouverLigneEnTetes([["Inscriptions 2026-2027"], [], ["Nom", "Prénom", "Instrument"], ["A", "B", "C"]])).toBe(2);
    expect(trouverLigneEnTetes([["x", "y"]])).toBe(0);
  });
});

describe("formaterTelephone", () => {
  it("remet le 0 perdu par Excel et espace les chiffres", () => {
    expect(formaterTelephone("612345678")).toBe("06 12 34 56 78");
    expect(formaterTelephone("06.12.34.56.78")).toBe("06 12 34 56 78");
    expect(formaterTelephone("+33 6 12 34 56 78")).toBe("06 12 34 56 78");
    expect(formaterTelephone("+41 79 123 45 67")).toBe("+41 79 123 45 67");
    expect(formaterTelephone("-")).toBeNull();
  });
});

describe("miseEnFormeCommune", () => {
  it("reprend l'écriture d'une commune connue", () => {
    expect(miseEnFormeCommune("VILLARD DE LANS", ["Villard-de-Lans"])).toBe("Villard-de-Lans");
    expect(miseEnFormeCommune("st nizier du moucherotte", ["Saint-Nizier-du-Moucherotte"])).toBe("Saint-Nizier-du-Moucherotte");
    expect(miseEnFormeCommune("LANS EN VERCORS", [])).toBe("Lans en Vercors");
    expect(miseEnFormeCommune("  ", [])).toBeNull();
  });
});

describe("extraireEleves", () => {
  const lignes = [
    ["Nom", "Prénom", "Instrument", "Mail mère", "Mail père", "Téléphone", "Commune", "Né le"],
    ["DUPONT", "Marie", "TROMPETTE", "a@x.fr", "B@X.FR", "612345678 / 0698765432", "villard de lans", "2015"],
    ["Dupont", "Marie", "Piano", "a@x.fr", "", "", "", ""],
    ["MARTIN", "Léo", "trompette, Chant", "", "", "", "Villard de Lans", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "Total", "", "", "", "", ""],
  ];
  const correspondance = correspondanceProposee(lignes[0]);

  it("devine les colonnes et ignore les autres", () => {
    expect(correspondance).toEqual(["nom", "prenom", "instrument", "email", "email", "telephone", "commune", null]);
  });

  it("fusionne un élève inscrit sur plusieurs lignes et nettoie les valeurs", () => {
    const r = extraireEleves(lignes, 0, correspondance, ["Villard-de-Lans"]);
    expect(r.eleves).toEqual([
      {
        nom: "DUPONT",
        prenom: "Marie",
        instruments: ["Trompette", "Piano"],
        emails: ["a@x.fr", "b@x.fr"],
        telephones: ["06 12 34 56 78", "06 98 76 54 32"],
        commune: "Villard-de-Lans",
      },
      { nom: "MARTIN", prenom: "Léo", instruments: ["Trompette", "Chant"], emails: [], telephones: [], commune: "Villard-de-Lans" },
    ]);
    expect(r.doublonsFusionnes).toBe(1);
    expect(r.lignesIgnorees).toBe(1); // la ligne « Total »
  });

  it("sépare nom et prénom écrits dans une même colonne", () => {
    const r = extraireEleves([["Élève"], ["DE LA TOUR Anne-Sophie"], ["Paul Durand"], ["élodie"]], 0, ["nomComplet"]);
    expect(r.eleves.map((e) => [e.nom, e.prenom])).toEqual([
      ["DE LA TOUR", "Anne-Sophie"],
      ["ÉLODIE", ""],
      ["PAUL", "Durand"],
    ]);
  });

  it("uniformise l'écriture des noms et prénoms", () => {
    const r = extraireEleves([["Nom", "Prénom"], ["Bernard", "CHLOÉ"], ["martin", "jean-luc"]], 0, ["nom", "prenom"]);
    expect(r.eleves.map((e) => `${e.nom} ${e.prenom}`)).toEqual(["BERNARD Chloé", "MARTIN Jean-Luc"]);
  });

  it("garde la correspondance d'une année sur l'autre", () => {
    const memo = correspondanceAMemoriser(["Nom", "Info", "Mail"], ["nom", "commune", null]);
    expect(correspondanceProposee(["NOM", "info", "Mail", "Prénom"], memo)).toEqual(["nom", "commune", null, "prenom"]);
  });
});

describe("filtrerEleves", () => {
  const eleves = extraireEleves(
    [
      ["Nom", "Prénom", "Instrument", "Commune", "Tél"],
      ["Durand", "Éloïse", "Trompette", "Villard-de-Lans", "0612345678"],
      ["Martin", "Léo", "Piano", "Autrans", ""],
      ["Petit", "Zoé", "Trompette", "Autrans", ""],
    ],
    0,
    ["nom", "prenom", "instrument", "commune", "telephone"]
  ).eleves;

  it("filtre par instrument, commune et texte libre (sans accents)", () => {
    const noms = (f: Parameters<typeof filtrerEleves>[1]) => filtrerEleves(eleves, f).map((e) => e.prenom);
    expect(noms({ texte: "", instrument: "Trompette", commune: "" })).toEqual(["Éloïse", "Zoé"]);
    expect(noms({ texte: "", instrument: "Trompette", commune: "Autrans" })).toEqual(["Zoé"]);
    expect(noms({ texte: "eloise", instrument: "", commune: "" })).toEqual(["Éloïse"]);
    expect(noms({ texte: "1234", instrument: "", commune: "" })).toEqual(["Éloïse"]);
  });

  it("liste les valeurs des filtres avec leur nombre", () => {
    expect(valeursFiltre(eleves, "commune")).toEqual([
      { valeur: "Autrans", nombre: 2 },
      { valeur: "Villard-de-Lans", nombre: 1 },
    ]);
  });
});

describe("cleNomEleve", () => {
  it("retrouve un élève quel que soit l'ordre ou la précision ajoutée", () => {
    const index = indexAnnuaire([{ nom: "MOSSALGUE", prenom: "Colin" }, { nom: "GIRARD-BLANC", prenom: "Eliott" }]);
    expect(index.get(cleNomEleve("Colin MOSSALGUE (trompette)"))?.prenom).toBe("Colin");
    expect(index.get(cleNomEleve("eliott girard blanc"))?.nom).toBe("GIRARD-BLANC");
    expect(index.get(cleNomEleve("Colin Martin"))).toBeUndefined();
    expect(nomAffiche({ nom: "MOSSALGUE", prenom: "Colin" })).toBe("Colin MOSSALGUE");
  });
});
