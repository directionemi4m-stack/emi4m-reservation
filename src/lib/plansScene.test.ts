import { describe, expect, it } from "vitest";
import {
  alignerEnLigne,
  changements,
  disposerEnArc,
  elementPourInstrument,
  inventaire,
  lireElements,
  problemes,
  seChevauchent,
  type ElementPlan,
  type ModeleElement,
} from "./plansScene";

const el = (o: Partial<ElementPlan>): ElementPlan => ({
  id: o.id ?? Math.random().toString(36).slice(2),
  nom: "Violon",
  categorie: "MUSICIEN",
  l: 80,
  p: 100,
  forme: "RECT",
  couleur: "#000000",
  abrege: null,
  chaise: true,
  pupitre: true,
  x: 0,
  y: 0,
  r: 0,
  label: null,
  fixe: false,
  ...o,
});

describe("seChevauchent", () => {
  it("détecte deux rectangles qui se recouvrent, pas deux rectangles collés", () => {
    expect(seChevauchent(el({ x: 100, y: 100 }), el({ x: 150, y: 100 }))).toBe(true);
    expect(seChevauchent(el({ x: 100, y: 100 }), el({ x: 180, y: 100 }))).toBe(false);
    expect(seChevauchent(el({ x: 100, y: 100 }), el({ x: 300, y: 300 }))).toBe(false);
  });
  it("tient compte de la rotation", () => {
    // Un rectangle long et fin tourné de 90° ne touche plus son voisin de droite.
    const long = el({ x: 100, y: 100, l: 200, p: 20 });
    const voisin = el({ x: 190, y: 100, l: 20, p: 20 });
    expect(seChevauchent(long, voisin)).toBe(true);
    expect(seChevauchent({ ...long, r: 90 }, voisin)).toBe(false);
  });
});

describe("problemes", () => {
  it("signale ce qui dépasse de la scène et ce qui se chevauche", () => {
    const a = el({ id: "a", x: 30, y: 100 });
    const b = el({ id: "b", x: 400, y: 200 });
    const c = el({ id: "c", x: 420, y: 220 });
    const r = problemes([a, b, c], 600, 400);
    expect([...r.dehors]).toEqual(["a"]);
    expect([...r.chevauchement].sort()).toEqual(["b", "c"]);
  });
  it("ne signale pas ce qui est posé sur un praticable", () => {
    const prat = el({ id: "p", nom: "Praticable 2 × 1 m", categorie: "MATERIEL", l: 200, p: 100, x: 300, y: 200 });
    const m = el({ id: "m", x: 300, y: 200 });
    expect(problemes([prat, m], 600, 400).chevauchement.size).toBe(0);
  });
});

describe("disposerEnArc", () => {
  it("répartit les musiciens sans chevauchement, tournés vers le centre", () => {
    const ids = ["1", "2", "3", "4", "5", "6"];
    const depart = ids.map((id, i) => el({ id, x: i * 10, y: 100 }));
    const arc = disposerEnArc(depart, new Set(ids), 1000, 600);
    expect(problemes(arc, 1000, 600).chevauchement.size).toBe(0);
    // Symétrie : le premier à gauche tourné d'un angle négatif, le dernier positif.
    expect(arc[0].x).toBeLessThan(500);
    expect(arc[5].x).toBeGreaterThan(500);
    expect(arc[0].r).toBeGreaterThan(180);
    expect(arc[5].r).toBeLessThan(180);
    expect(arc[5].r).toBeGreaterThan(0);
  });
  it("ne bouge pas les éléments fixes", () => {
    const fixe = el({ id: "f", x: 5, y: 5, fixe: true });
    const r = disposerEnArc([fixe, el({ id: "a" }), el({ id: "b", x: 50 })], new Set(["f", "a", "b"]), 800, 500);
    expect(r[0]).toEqual(fixe);
  });
});

describe("alignerEnLigne", () => {
  it("aligne de gauche à droite sans recouvrement", () => {
    const r = alignerEnLigne([el({ id: "a", x: 300, y: 80 }), el({ id: "b", x: 100, y: 120 })], new Set(["a", "b"]));
    expect(r.every((e) => e.y === 100 && e.r === 0)).toBe(true);
    expect(r[0].x - r[1].x).toBe(90);
  });
});

describe("inventaire et changements", () => {
  it("compte chaises et pupitres des musiciens et le matériel", () => {
    const plan = [
      el({ nom: "Violoncelle" }),
      el({ nom: "Contrebasse", chaise: false }),
      el({ nom: "Piano à queue", categorie: "MATERIEL", chaise: false, pupitre: false }),
      el({ nom: "Chaise", categorie: "MOBILIER", chaise: true, pupitre: false }),
      el({ nom: "Pilier", categorie: "DECOR", fixe: true }),
    ];
    expect(Object.fromEntries(inventaire(plan))).toEqual({ Chaise: 2, Pupitre: 2, "Piano à queue": 1 });
  });
  it("donne ce qu'il faut ajouter et retirer entre deux passages", () => {
    const avant = [el({}), el({}), el({ nom: "Piano à queue", categorie: "MATERIEL", chaise: false, pupitre: false })];
    const apres = [el({}), el({}), el({}), el({ nom: "Contrebasse", chaise: false })];
    expect(changements(avant, apres)).toEqual([
      { nom: "Chaise", delta: 1 },
      { nom: "Pupitre", delta: 2 },
      { nom: "Piano à queue", delta: -1 },
    ]);
  });
});

describe("elementPourInstrument", () => {
  const cat: ModeleElement[] = [
    { nom: "Violon", categorie: "MUSICIEN", largeurCm: 75, profondeurCm: 110, forme: "RECT", couleur: "#000000", abrege: null, chaise: true, pupitre: true, motsCles: "violon" },
    { nom: "Violoncelle", categorie: "MUSICIEN", largeurCm: 110, profondeurCm: 150, forme: "RECT", couleur: "#000000", abrege: null, chaise: true, pupitre: true, motsCles: "violoncelle, cello" },
    { nom: "Guitare électrique", categorie: "MUSICIEN", largeurCm: 70, profondeurCm: 80, forme: "RECT", couleur: "#000000", abrege: null, chaise: false, pupitre: true, motsCles: "guitare électrique" },
    { nom: "Guitare", categorie: "MUSICIEN", largeurCm: 80, profondeurCm: 100, forme: "RECT", couleur: "#000000", abrege: null, chaise: true, pupitre: true, motsCles: "guitare" },
  ];
  it("reconnaît l'instrument le plus précis", () => {
    expect(elementPourInstrument("Violoncelle", cat)?.nom).toBe("Violoncelle");
    expect(elementPourInstrument("violon", cat)?.nom).toBe("Violon");
    expect(elementPourInstrument("Guitare electrique", cat)?.nom).toBe("Guitare électrique");
    expect(elementPourInstrument("Guitare", cat)?.nom).toBe("Guitare");
    expect(elementPourInstrument("Cello", cat)?.nom).toBe("Violoncelle");
    expect(elementPourInstrument("Formation musicale", cat)).toBeNull();
  });
});

describe("lireElements", () => {
  it("assainit le JSON enregistré", () => {
    const r = lireElements([{ id: "a", nom: "X", l: -5, p: 99999, x: "n", r: 400, couleur: "rouge", categorie: "AUTRE" }, null, "x"]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ id: "a", l: 10, p: 2000, x: 0, r: 40, couleur: "#64748b", categorie: "MATERIEL" });
  });
});
