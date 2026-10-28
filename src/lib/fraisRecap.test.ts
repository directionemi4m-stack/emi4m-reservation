import { describe, expect, it } from "vitest";
import { recapMensuelActivites, recapMensuelFrais, tauxExact } from "./fraisRecap";
import { dureeEnMinutes } from "./activiteAccessoire";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const trajet = (iso: string, km = 18, prix = 3.6, supprime = false) => ({
  date: d(iso),
  trajetNom: km === 36 ? "Villard/Autrans" : "Villard/Lans en Vercors",
  km,
  prix,
  supprimeLe: supprime ? d(iso) : null,
});

const ligne = (lignes: (string | number)[][], libelle: string) => lignes.find((l) => l[0] === libelle);

describe("recapMensuelFrais", () => {
  it("totalise par mois et sur l'année scolaire, de septembre à août", () => {
    const lignes = recapMensuelFrais([
      trajet("2026-09-14"),
      trajet("2026-09-21"),
      trajet("2026-10-05", 36, 6.4),
      trajet("2027-03-01"),
    ]);
    expect(lignes[0]).toEqual(["Récapitulatif 2026-2027"]);
    expect(lignes[1]).toEqual(["Mois", "Trajets", "Km", "Taux (€/km)", "€"]);
    expect(lignes[2][0]).toBe("Septembre 2026");
    expect(ligne(lignes, "Août 2027")).toBeDefined();
    expect(ligne(lignes, "Septembre 2026")).toEqual(["Septembre 2026", 2, 36, "", 7.2]);
    expect(ligne(lignes, "Octobre 2026")).toEqual(["Octobre 2026", 1, 36, "", 6.4]);
    expect(ligne(lignes, "Mars 2027")).toEqual(["Mars 2027", 1, 18, "", 3.6]);
    expect(ligne(lignes, "Novembre 2026")).toEqual(["Novembre 2026", 0, 0, "", 0]);
    expect(ligne(lignes, "Total année 2026-2027")).toEqual(["Total année 2026-2027", 4, 90, "", 17.2]);
  });

  it("ne compte pas les trajets supprimés", () => {
    const lignes = recapMensuelFrais([trajet("2026-09-14"), trajet("2026-09-21", 18, 3.6, true)]);
    expect(ligne(lignes, "Septembre 2026")).toEqual(["Septembre 2026", 1, 18, "", 3.6]);
  });

  it("évite les erreurs d'arrondi des additions", () => {
    const douze = Array.from({ length: 12 }, (_, i) => trajet(`2026-09-${String(i + 1).padStart(2, "0")}`));
    expect(ligne(recapMensuelFrais(douze), "Septembre 2026")?.[4]).toBe(43.2);
  });

  it("sépare deux années scolaires", () => {
    const lignes = recapMensuelFrais([trajet("2026-06-15"), trajet("2026-09-14")]);
    expect(ligne(lignes, "Total année 2025-2026")?.[1]).toBe(1);
    expect(ligne(lignes, "Total année 2026-2027")?.[1]).toBe(1);
  });

  it("affiche l'année en cours à zéro s'il n'y a aucun trajet", () => {
    const lignes = recapMensuelFrais([], d("2026-10-25"));
    expect(lignes[0]).toEqual(["Récapitulatif 2026-2027"]);
    expect(ligne(lignes, "Total année 2026-2027")).toEqual(["Total année 2026-2027", 0, 0, "", 0]);
  });
  it("ventile chaque mois et l'année par destination, avec le taux exact", () => {
    const lignes = recapMensuelFrais([trajet("2026-09-14"), trajet("2026-09-21"), trajet("2026-09-25", 36, 6.4)]);
    const i = lignes.findIndex((l) => l[0] === "Septembre 2026");
    expect(lignes[i + 1]).toEqual(["    Villard/Autrans", 1, 36, 0.177778, 6.4]);
    expect(lignes[i + 2]).toEqual(["    Villard/Lans en Vercors", 2, 36, 0.2, 7.2]);
    expect(lignes[i + 3][0]).toBe("Octobre 2026"); // mois vide : pas de détail
    const t = lignes.findIndex((l) => l[0] === "Total année 2026-2027");
    expect(lignes[t + 1]).toEqual(["    Villard/Autrans", 1, 36, 0.177778, 6.4]);
  });
});

// Barème officiel EMI4M au 01/10/2020 (montant forfaitaire par trajet) et distances.
const BAREME: [string, number, number][] = [
  ["Villard/Autrans", 36, 6.4], ["Villard/Lans en Vercors", 18, 3.6], ["Villard/Méaudre", 20, 4.2],
  ["Villard/Saint Nizier", 36, 7.2], ["Villard/Engins", 31, 6.4], ["Villard/Grenoble", 76, 15.2],
  ["Autrans/Méaudre", 14, 2.8], ["Autrans/Lans en Vercors", 21, 4.2], ["Autrans/Saint Nizier", 39, 8.4],
  ["Méaudre/Lans en Vercors", 24, 6], ["Méaudre/Saint Nizier", 42, 8.4], ["Lans en Vercors/Saint Nizier", 18, 3.6],
  ["Lans en Vercors/Grenoble", 60, 13.6], ["Saint Nizier/Grenoble", 38, 7.2],
];

describe("tauxExact", () => {
  it.each(BAREME)("%s : km × taux redonne le montant du barème au centime, même cumulé", (_nom, km, prix) => {
    const taux = tauxExact(prix, km) as number;
    for (let n = 1; n <= 100; n++) {
      expect(Math.round(n * km * taux * 100) / 100).toBe(Math.round(n * prix * 100) / 100);
    }
  });
});

describe("dureeEnMinutes", () => {
  it("lit les durées de la liste d'activité accessoire", () => {
    expect(dureeEnMinutes("1h00")).toBe(60);
    expect(dureeEnMinutes("1h30")).toBe(90);
    expect(dureeEnMinutes("8h00")).toBe(480);
    expect(dureeEnMinutes("n'importe quoi")).toBe(0);
  });
});

describe("recapMensuelActivites", () => {
  const activite = (iso: string, duree: string, horsForfait = false, supprime = false) => ({
    date: d(iso),
    duree,
    horsForfait,
    supprimeLe: supprime ? d(iso) : null,
  });
  const activites = [
    activite("2026-09-14", "1h30"),
    activite("2026-09-20", "2h00"),
    activite("2026-10-02", "3h30", true), // ex. remplacement
    activite("2026-10-09", "1h00", false, true), // supprimée
  ];

  it("sépare par mois les heures au forfait et les heures hors forfait à payer", () => {
    const lignes = recapMensuelActivites(activites, { "2026-2027": 5 * 60 });
    expect(lignes[1]).toEqual(["Mois", "Activités", "Au forfait (h)", "Hors forfait à payer (h)"]);
    expect(ligne(lignes, "Septembre 2026")).toEqual(["Septembre 2026", 2, 3.5, 0]);
    expect(ligne(lignes, "Octobre 2026")).toEqual(["Octobre 2026", 1, 0, 3.5]);
    expect(ligne(lignes, "Total année 2026-2027")).toEqual(["Total année 2026-2027", 3, 3.5, 3.5]);
  });

  it("ajoute le bilan du forfait sous le total de l'année", () => {
    const lignes = recapMensuelActivites(activites, { "2026-2027": 5 * 60 });
    expect(ligne(lignes, "Heures hebdo du contrat")).toEqual(["Heures hebdo du contrat", "5 h"]);
    expect(ligne(lignes, "Forfait annuel (× 6) (h)")?.[1]).toBe(30);
    expect(ligne(lignes, "Reste du forfait (h)")?.[1]).toBe(26.5);
    expect(ligne(lignes, "Dépassement à payer en fin d'année (h)")?.[1]).toBe(0);
    expect(ligne(lignes, "Total à payer sur l'année (h)")?.[1]).toBe(3.5);
  });

  it("signale un contrat non renseigné sans inventer de dépassement", () => {
    const lignes = recapMensuelActivites(activites, {});
    expect(ligne(lignes, "Heures hebdo du contrat")?.[1]).toBe("Non renseignées par la direction");
    expect(ligne(lignes, "Hors forfait à payer (h)")?.[1]).toBe(3.5);
    expect(ligne(lignes, "Dépassement à payer en fin d'année (h)")).toBeUndefined();
  });
});
