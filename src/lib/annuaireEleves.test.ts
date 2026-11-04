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
  nomAffiche,
  rapprocheurAnnuaire,
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

describe("rapprocheurAnnuaire", () => {
  const annuaire = [
    { nom: "MOSSALGUE", prenom: "Colin", instruments: ["Trompette"] },
    { nom: "HERMANT", prenom: "Colin", instruments: ["Batterie"] },
    { nom: "GIRARD-BLANC", prenom: "Eliott", instruments: [] },
    { nom: "PODKOWA", prenom: "Cassandre", instruments: ["Violon"] },
    { nom: "DI SAN BERNARDO - SAPHENGTHONG", prenom: "Vanh", instruments: ["Guitare sèche"] },
    { nom: "ZAWADZKI", prenom: "Ulysse", instruments: ["Guitare sèche"] },
    { nom: "MAGNIN", prenom: "Leoni", instruments: ["Violon"] },
    { nom: "THIERY-TILLON", prenom: "Léonie", instruments: ["Flûte traversière"] },
    { nom: "DARGAUD", prenom: "Sibylle", instruments: ["Violon"] },
    { nom: "DESBOIS", prenom: "Sibylle", instruments: ["Guitare sèche"] },
    { nom: "MARTIN", prenom: "Jeanne", instruments: ["Piano"] },
    { nom: "MARTIN", prenom: "Paul", instruments: ["Piano"] },
  ];
  const retrouver = rapprocheurAnnuaire(annuaire);
  const qui = (nom: string, cours = "") => {
    const r = retrouver(nom, cours);
    return r ? `${nomAffiche(r.eleve)}${r.approche ? " ~" : ""}` : null;
  };

  it("retrouve un élève quel que soit l'ordre ou la précision ajoutée", () => {
    expect(qui("Colin MOSSALGUE (trompette)")).toBe("Colin MOSSALGUE");
    expect(qui("eliott girard blanc")).toBe("Eliott GIRARD-BLANC");
    expect(nomAffiche({ nom: "MOSSALGUE", prenom: "Colin" })).toBe("Colin MOSSALGUE");
    expect(cleNomEleve("MOSSALGUE Colin")).toBe(cleNomEleve("colin mossalgue"));
  });

  it("tolère les fautes, les noms incomplets et les mots collés", () => {
    expect(qui("Cassandre podkova")).toBe("Cassandre PODKOWA ~");
    expect(qui("Vanh Di San Bernardo")).toBe("Vanh DI SAN BERNARDO - SAPHENGTHONG ~");
    expect(qui("Vanh Di Sanbernardo  Saphengthong")).toBe("Vanh DI SAN BERNARDO - SAPHENGTHONG ~");
    expect(qui("UlysseZawadski")).toBe("Ulysse ZAWADZKI ~");
    expect(qui("MAGNIN Léonie")).toBe("Leoni MAGNIN ~");
    expect(qui("Colin M")).toBe("Colin MOSSALGUE ~");
  });

  it("prend un prénom seul s'il est sans ambiguïté, ou si l'instrument du cours départage", () => {
    expect(qui("Cassandre")).toBe("Cassandre PODKOWA ~");
    expect(qui("Leoni")).toBe("Leoni MAGNIN ~"); // écrit pareil, pas Léonie THIERY-TILLON
    expect(qui("Colin", "Trompette")).toBe("Colin MOSSALGUE ~");
    expect(qui("Sibylle", "Ensemble Cordes")).toBe("Sibylle DARGAUD ~");
    expect(qui("Colin")).toBeNull(); // deux Colin, rien pour départager
  });

  it("ne propose personne plutôt qu'une mauvaise famille", () => {
    expect(qui("Colin Martin")).toBeNull();
    expect(qui("Martin", "Piano")).toBeNull();
    expect(qui("Louis Cressi")).toBeNull();
    expect(qui("Cassandr")).toBeNull(); // pas de faute sur un prénom seul
  });
});
