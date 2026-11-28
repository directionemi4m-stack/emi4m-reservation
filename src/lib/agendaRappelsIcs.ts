// Agenda « Rappels EMI4M » (format iCalendar) auquel la direction s'abonne dans Google Agenda :
// pour chaque événement de la saison, « Préparer le matos » 2 jours avant et « Aller chercher
// les clés » la veille, à 9h00. Logique pure, testée dans agendaRappelsIcs.test.ts.
import { createHmac, timingSafeEqual } from "crypto";
import { minutesVersHeure } from "@/lib/agenda";
import { libelleLieu } from "@/lib/saison";
import { JOURS_AVANT } from "@/lib/rappelsEvenements";

export interface EvenementAgenda {
  id: string;
  titre: string;
  date: Date; // minuit UTC (colonne @db.Date)
  heureDebutMinutes: number | null;
  lieuNom: string | null;
  lieuPrecis: string | null;
}

// Jeton secret de l'adresse d'abonnement, dérivé du secret de l'appli : pas de mot de passe
// à saisir dans Google Agenda, mais l'adresse ne se devine pas.
export function jetonAgendaRappels(secret: string) {
  return createHmac("sha256", secret).update("agenda-rappels-emi4m").digest("hex").slice(0, 32);
}

export function jetonAgendaValide(jeton: string | null, secret: string) {
  const attendu = Buffer.from(jetonAgendaRappels(secret));
  const recu = Buffer.from(jeton ?? "");
  return recu.length === attendu.length && timingSafeEqual(recu, attendu);
}

const echapper = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// Lignes de 75 octets au plus, les suivantes commençant par une espace (RFC 5545).
function plier(ligne: string) {
  const morceaux: string[] = [];
  let courant = "";
  for (const c of ligne) {
    if (Buffer.byteLength(courant + c) > (morceaux.length ? 74 : 75)) {
      morceaux.push(courant);
      courant = "";
    }
    courant += c;
  }
  morceaux.push(courant);
  return morceaux.join("\r\n ");
}

function jourCompact(d: Date, decalage: number) {
  const j = new Date(d.getTime() - decalage * 24 * 3600 * 1000);
  return j.toISOString().slice(0, 10).replace(/-/g, "");
}

const horodatage = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const FUSEAU = [
  "BEGIN:VTIMEZONE", "TZID:Europe/Paris",
  "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
  "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
  "END:VTIMEZONE",
];

export function agendaRappelsIcs(evenements: EvenementAgenda[], maintenant: Date, urlBase: string) {
  const lignes = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EMI4M//Rappels de la saison//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:Rappels EMI4M", "X-WR-TIMEZONE:Europe/Paris", "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H",
    ...FUSEAU,
  ];
  for (const e of evenements) {
    const jourLong = e.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
    const lieu = libelleLieu(e.lieuNom, e.lieuPrecis);
    const description = `${e.titre} le ${jourLong}${e.heureDebutMinutes != null ? ` à ${minutesVersHeure(e.heureDebutMinutes)}` : ""}${lieu ? `, ${lieu}` : ""}.\n${urlBase}/saison/${e.id}`;
    const court = e.date.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });
    for (const [genre, titre] of [
      ["materiel", `🎒 Préparer le matos – ${e.titre} (${court})`],
      ["cles", `🔑 Aller chercher les clés – ${e.titre} (demain)`],
    ] as const) {
      const jour = jourCompact(e.date, JOURS_AVANT[genre]);
      lignes.push(
        "BEGIN:VEVENT",
        `UID:${e.id}-${genre}@emi4m`,
        `DTSTAMP:${horodatage(maintenant)}`,
        `DTSTART;TZID=Europe/Paris:${jour}T090000`,
        `DTEND;TZID=Europe/Paris:${jour}T091500`,
        `SUMMARY:${echapper(titre)}`,
        `DESCRIPTION:${echapper(description)}`,
        `URL:${urlBase}/saison/${e.id}`,
        "TRANSP:TRANSPARENT",
        "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${echapper(titre)}`, "TRIGGER:PT0M", "END:VALARM",
        "END:VEVENT"
      );
    }
  }
  lignes.push("END:VCALENDAR");
  return lignes.map(plier).join("\r\n") + "\r\n";
}
