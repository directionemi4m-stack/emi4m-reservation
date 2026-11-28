import { describe, expect, it } from "vitest";
import { agendaRappelsIcs, jetonAgendaRappels, jetonAgendaValide } from "./agendaRappelsIcs";

const ag = {
  id: "abc",
  titre: "AG",
  date: new Date("2026-12-12T00:00:00.000Z"),
  heureDebutMinutes: 19 * 60,
  lieuNom: "Villard-de-Lans",
  lieuPrecis: "Verrière",
};

describe("agendaRappelsIcs", () => {
  const ics = agendaRappelsIcs([ag, { ...ag, id: "nv", titre: "Concert du Nouvel An", date: new Date("2027-01-01T00:00:00.000Z"), heureDebutMinutes: null }], new Date("2026-11-28T08:00:00Z"), "https://exemple.fr");
  const deplie = ics.replace(/\r\n /g, "");

  it("deux rappels par événement, 2 jours avant et la veille à 9h, heure de Paris", () => {
    expect(deplie).toContain("UID:abc-materiel@emi4m\r\n");
    expect(deplie).toContain("DTSTART;TZID=Europe/Paris:20261210T090000");
    expect(deplie).toContain("UID:abc-cles@emi4m\r\n");
    expect(deplie).toContain("DTSTART;TZID=Europe/Paris:20261211T090000");
    expect(deplie).toContain("DTSTART;TZID=Europe/Paris:20261230T090000");
    expect(deplie).toContain("DTSTART;TZID=Europe/Paris:20261231T090000");
    expect(deplie.match(/BEGIN:VEVENT/g)).toHaveLength(4);
  });

  it("titres et description lisibles, caractères spéciaux échappés", () => {
    expect(deplie).toContain("SUMMARY:🎒 Préparer le matos – AG (sam. 12/12)");
    expect(deplie).toContain("SUMMARY:🔑 Aller chercher les clés – AG (demain)");
    expect(deplie).toContain("DESCRIPTION:AG le samedi 12 décembre à 19h00\\, Villard-de-Lans · Verrière.\\nhttps://exemple.fr/saison/abc");
  });

  it("lignes de 75 octets au plus, fins de ligne CRLF", () => {
    for (const l of ics.split("\r\n")) expect(Buffer.byteLength(l)).toBeLessThanOrEqual(75);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});

describe("jeton", () => {
  it("valide le bon jeton seulement", () => {
    const j = jetonAgendaRappels("secret");
    expect(j).toHaveLength(32);
    expect(jetonAgendaValide(j, "secret")).toBe(true);
    expect(jetonAgendaValide(j, "autre")).toBe(false);
    expect(jetonAgendaValide(null, "secret")).toBe(false);
    expect(jetonAgendaValide("court", "secret")).toBe(false);
  });
});
