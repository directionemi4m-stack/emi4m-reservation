import { describe, expect, it } from "vitest";
import { recapMensuelActivites, recapMensuelFrais } from "./fraisRecap";
import { dureeEnMinutes } from "./activiteAccessoire";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const trajet = (iso: string, km = 18, prix = 3.6, supprime = false) => ({
  date: d(iso),
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
    expect(lignes[1]).toEqual(["Mois", "Trajets", "Km", "€"]);
    expect(lignes[2][0]).toBe("Septembre 2026");
    expect(lignes[13][0]).toBe("Août 2027");
    expect(ligne(lignes, "Septembre 2026")).toEqual(["Septembre 2026", 2, 36, 7.2]);
    expect(ligne(lignes, "Octobre 2026")).toEqual(["Octobre 2026", 1, 36, 6.4]);
    expect(ligne(lignes, "Mars 2027")).toEqual(["Mars 2027", 1, 18, 3.6]);
    expect(ligne(lignes, "Novembre 2026")).toEqual(["Novembre 2026", 0, 0, 0]);
    expect(ligne(lignes, "Total année 2026-2027")).toEqual(["Total année 2026-2027", 4, 90, 17.2]);
  });

  it("ne compte pas les trajets supprimés", () => {
    const lignes = recapMensuelFrais([trajet("2026-09-14"), trajet("2026-09-21", 18, 3.6, true)]);
    expect(ligne(lignes, "Septembre 2026")).toEqual(["Septembre 2026", 1, 18, 3.6]);
  });

  it("évite les erreurs d'arrondi des additions", () => {
    const douze = Array.from({ length: 12 }, (_, i) => trajet(`2026-09-${String(i + 1).padStart(2, "0")}`));
    expect(ligne(recapMensuelFrais(douze), "Septembre 2026")?.[3]).toBe(43.2);
  });

  it("sépare deux années scolaires", () => {
    const lignes = recapMensuelFrais([trajet("2026-06-15"), trajet("2026-09-14")]);
    expect(ligne(lignes, "Total année 2025-2026")?.[1]).toBe(1);
    expect(ligne(lignes, "Total année 2026-2027")?.[1]).toBe(1);
  });

  it("affiche l'année en cours à zéro s'il n'y a aucun trajet", () => {
    const lignes = recapMensuelFrais([], d("2026-10-25"));
    expect(lignes[0]).toEqual(["Récapitulatif 2026-2027"]);
    expect(ligne(lignes, "Total année 2026-2027")).toEqual(["Total année 2026-2027", 0, 0, 0]);
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
  const activite = (iso: string, duree: string, supprime = false) => ({
    date: d(iso),
    duree,
    supprimeLe: supprime ? d(iso) : null,
  });

  it("totalise le nombre d'activités et les heures, par mois et sur l'année", () => {
    const lignes = recapMensuelActivites([
      activite("2026-09-14", "1h30"),
      activite("2026-09-20", "2h00"),
      activite("2026-10-02", "3h30"),
      activite("2026-10-09", "1h00", true),
    ]);
    expect(lignes[1]).toEqual(["Mois", "Activités", "Durée", "Heures (décimal)"]);
    expect(ligne(lignes, "Septembre 2026")).toEqual(["Septembre 2026", 2, "3 h 30", 3.5]);
    expect(ligne(lignes, "Octobre 2026")).toEqual(["Octobre 2026", 1, "3 h 30", 3.5]);
    expect(ligne(lignes, "Novembre 2026")).toEqual(["Novembre 2026", 0, "0 h", 0]);
    expect(ligne(lignes, "Total année 2026-2027")).toEqual(["Total année 2026-2027", 3, "7 h", 7]);
  });
});
