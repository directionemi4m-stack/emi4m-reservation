import { describe, expect, it } from "vitest";
import { affilieEnAnnee, ajouterMois, calculerSuivi, controleFacture, echeanceSuivi, type SalarieSuivi } from "./santeTravail";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const AUJOURDHUI = d("2026-11-25");

function salarie(p: Partial<SalarieSuivi> = {}): SalarieSuivi {
  return { categorie: "SIG", embaucheLe: null, sortieLe: null, affilieLe: d("2020-01-01"), desaffilieLe: null, anneeNaissance: null, visites: [], ...p };
}

describe("ajouterMois", () => {
  it("garde le jour, ou prend la fin du mois quand il n'existe pas", () => {
    expect(ajouterMois(d("2026-01-15"), 3)).toEqual(d("2026-04-15"));
    expect(ajouterMois(d("2026-08-31"), 6)).toEqual(d("2027-02-28"));
    expect(ajouterMois(d("2021-11-10"), 60)).toEqual(d("2026-11-10"));
  });
});

describe("echeanceSuivi", () => {
  it("sans visite : 3 mois après l'embauche en suivi général, avant la prise de poste sinon", () => {
    expect(echeanceSuivi(salarie({ embaucheLe: d("2026-09-01") }))).toEqual(d("2026-12-01"));
    expect(echeanceSuivi(salarie({ categorie: "SIR", embaucheLe: d("2026-09-01") }))).toEqual(d("2026-09-01"));
    expect(echeanceSuivi(salarie())).toBeNull();
  });

  it("après une visite : la date notée sur l'attestation, sinon le délai de la catégorie", () => {
    const visite = { type: "PERIODIQUE" as const, statut: "REALISEE" as const, date: d("2024-03-10"), prochaineAvant: null };
    expect(echeanceSuivi(salarie({ visites: [visite] }))).toEqual(d("2029-03-10"));
    expect(echeanceSuivi(salarie({ categorie: "SIA", visites: [visite] }))).toEqual(d("2027-03-10"));
    expect(echeanceSuivi(salarie({ visites: [{ ...visite, prochaineAvant: d("2026-06-30") }] }))).toEqual(d("2026-06-30"));
  });

  it("une visite de reprise sans date de prochaine visite ne repousse pas le suivi", () => {
    const visites = [
      { type: "EMBAUCHE" as const, statut: "REALISEE" as const, date: d("2022-01-10"), prochaineAvant: null },
      { type: "REPRISE" as const, statut: "REALISEE" as const, date: d("2025-05-02"), prochaineAvant: null },
    ];
    expect(echeanceSuivi(salarie({ visites }))).toEqual(d("2027-01-10"));
  });
});

describe("calculerSuivi", () => {
  it("signale un retard, une échéance proche, ou un suivi à jour", () => {
    const visite = (date: string) => [{ type: "PERIODIQUE" as const, statut: "REALISEE" as const, date: d(date), prochaineAvant: null }];
    expect(calculerSuivi(salarie({ visites: visite("2021-06-01") }), AUJOURDHUI).etat).toBe("EN_RETARD");
    expect(calculerSuivi(salarie({ visites: visite("2022-01-15") }), AUJOURDHUI).etat).toBe("BIENTOT");
    expect(calculerSuivi(salarie({ visites: visite("2025-01-15") }), AUJOURDHUI).etat).toBe("A_JOUR");
    expect(calculerSuivi(salarie(), AUJOURDHUI).etat).toBe("A_RENSEIGNER");
  });

  it("une convocation à venir prime ; passée, elle demande confirmation", () => {
    const ancienne = { type: "PERIODIQUE" as const, statut: "REALISEE" as const, date: d("2019-01-01"), prochaineAvant: null };
    const prevue = (date: string) => ({ type: "PERIODIQUE" as const, statut: "PREVUE" as const, date: d(date), prochaineAvant: null });
    const s1 = calculerSuivi(salarie({ visites: [ancienne, prevue("2026-12-03")] }), AUJOURDHUI);
    expect(s1.etat).toBe("PROGRAMMEE");
    expect(s1.phrase).toContain("3 déc. 2026");
    expect(calculerSuivi(salarie({ visites: [ancienne, prevue("2026-11-20")] }), AUJOURDHUI).etat).toBe("A_CONFIRMER");
    const demandee = { type: "REPRISE" as const, statut: "DEMANDEE" as const, date: null, prochaineAvant: null };
    expect(calculerSuivi(salarie({ visites: [demandee] }), AUJOURDHUI).phrase).toBe("Visite de reprise demandée, date à venir");
  });

  it("alerte sur la déclaration au service et la visite de mi-carrière", () => {
    expect(calculerSuivi(salarie({ affilieLe: null }), AUJOURDHUI).alertes[0].cle).toBe("NON_DECLARE");
    expect(calculerSuivi(salarie({ anneeNaissance: 1981 }), AUJOURDHUI).alertes[0].texte).toContain("mi-carrière");
    expect(calculerSuivi(salarie({ anneeNaissance: 1990 }), AUJOURDHUI).alertes).toEqual([]);
    const parti = calculerSuivi(salarie({ sortieLe: d("2026-07-31") }), AUJOURDHUI);
    expect(parti.etat).toBe("SORTI");
    expect(parti.alertes[0].cle).toBe("PARTI_DECLARE");
  });
});

describe("factures", () => {
  it("compte les salariés déclarés pendant l'année", () => {
    expect(affilieEnAnnee({ affilieLe: d("2025-09-01"), desaffilieLe: null }, 2026)).toBe(true);
    expect(affilieEnAnnee({ affilieLe: d("2027-01-05"), desaffilieLe: null }, 2026)).toBe(false);
    expect(affilieEnAnnee({ affilieLe: d("2020-09-01"), desaffilieLe: d("2025-08-31") }, 2026)).toBe(false);
    expect(affilieEnAnnee({ affilieLe: null, desaffilieLe: null }, 2026)).toBe(false);
  });

  it("compare le nombre facturé au nombre déclaré", () => {
    expect(controleFacture(12, 12)?.ok).toBe(true);
    expect(controleFacture(14, 12)?.texte).toBe("14 salariés facturés, mais 12 déclarés dans l'appli cette année");
    expect(controleFacture(null, 12)).toBeNull();
  });
});
