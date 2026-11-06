import { describe, expect, it } from "vitest";
import { elevesASuivre, niveauASuivre, ongletASuivre, parMois, statsParEleve, type MarqueStat, type Statut } from "./statsPresences";

const m = (personne: string, statut: Statut, jour: number, cours = "Violon"): MarqueStat => ({
  personne,
  nom: personne,
  cours,
  prof: "Marie G.",
  date: new Date(Date.UTC(2026, 9, jour)),
  statut,
});
const fois = (n: number, f: (i: number) => MarqueStat) => Array.from({ length: n }, (_, i) => f(i));

const marques = [
  ...fois(8, (i) => m("Léa", i < 2 ? "ABSENT" : "PRESENT", i + 1)), // 2 absences injustifiées
  ...fois(4, (i) => m("Tom", i < 2 ? "EXCUSE" : "PRESENT", i + 1)), // 50 % manqués
  ...fois(10, (i) => m("Zoé", i < 3 ? "EXCUSE" : "PRESENT", i + 1)), // 3 excusés, 30 %
  ...fois(12, (i) => m("Max", i < 3 ? "EXCUSE" : "PRESENT", i + 1, i % 2 ? "FM1" : "Piano")), // 3 excusés sur 12 = 25 %
  ...fois(10, (i) => m("Ana", i === 0 ? "EXCUSE" : "PRESENT", i + 1)),
];

describe("statistiques de présence", () => {
  it("regroupe un élève sur tous ses cours, en gardant le détail par cours", () => {
    const max = statsParEleve(marques).find((s) => s.personne === "Max")!;
    expect(max).toMatchObject({ cours: ["FM1", "Piano"], seances: 12, present: 9, excuse: 3, absent: 0 });
    // Excusé aux séances 1 et 3 (Piano) et 2 (FM1) : le cours le plus manqué vient en premier.
    expect(max.parCours.map((c) => `${c.cours}:${c.excuse}/${c.seances}`)).toEqual(["Piano:2/6", "FM1:1/6"]);
  });

  it("montre une ligne par cours, avec le bilan de tous les cours", () => {
    const onglet = ongletASuivre(marques, "2026-2027", "5 novembre 2026");
    const lignesMax = onglet.lignes.filter((l) => l[1] === "Max");
    expect(lignesMax.map((l) => [l[0], l[2], l[6]])).toEqual([
      ["Souvent excusé", "Piano", 2],
      ["Souvent excusé", "FM1", 1],
    ]);
    expect(lignesMax[0][10]).toBe("75 % de présence sur 12 séances (3 exc., 0 abs.)");
  });

  it("classe les élèves à suivre, du plus préoccupant au moins préoccupant", () => {
    const suivre = elevesASuivre(statsParEleve(marques)).map((s) => `${s.nom}:${s.niveau}`);
    expect(suivre).toEqual(["Léa:Absences injustifiées", "Tom:Souvent absent", "Zoé:Souvent absent", "Max:Souvent excusé"]);
  });

  it("ne signale pas un élève rarement absent", () => {
    const ana = statsParEleve(marques).find((s) => s.personne === "Ana")!;
    expect(niveauASuivre(ana)).toBeNull();
  });

  it("compte par mois et met en couleur les lignes à suivre", () => {
    expect(parMois(marques)[0]).toMatchObject({ libelle: "Octobre 2026", seances: marques.length });
    const onglet = ongletASuivre(marques, "2026-2027", "5 novembre 2026");
    expect(onglet.lignes[4][0]).toBe("À suivre");
    expect(onglet.lignes[5].slice(0, 2)).toEqual(["Absences injustifiées", "Léa"]);
    expect(onglet.couleurs).toHaveLength(5); // Max a deux lignes (Piano, FM1)
  });
});
