// Conventions de réservation signées avec les mairies : petites règles partagées par
// l'appli et le registre du Drive. Module pur.
import type { StatutCreneau } from "@/generated/prisma/client";

// Saison scolaire, de septembre à août : un concert du 19/12/2026 relève de « 2026-2027 ».
export function saisonDe(date: Date): string {
  const debut = date.getUTCMonth() >= 8 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
  return `${debut}-${debut + 1}`;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export function nomFichierConvention(c: { date: Date; salle: string; commune: string; prof: string }): string {
  return `${ymd(c.date)} ${c.salle} (${c.commune}) - ${c.prof}.pdf`.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ");
}

export const LIBELLES_RESERVATION: Record<StatutCreneau, string> = {
  EN_ATTENTE: "En attente",
  VALIDEE: "Validée",
  REFUSEE: "Refusée",
  ANNULEE: "Annulée",
};

// « 2026-11-04 » saisi dans un champ date → date à minuit UTC ; vide → null ; sinon undefined.
export function lireDate(v: FormDataEntryValue | null): Date | null | undefined {
  const t = typeof v === "string" ? v.trim() : "";
  if (!t) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return undefined;
  const d = new Date(`${t}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || ymd(d) !== t ? undefined : d;
}

export function aujourdHuiUTC(maintenant = new Date()): Date {
  const local = new Date(maintenant.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  return new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
}

export const COMMENTAIRE_MAX = 500;

// « Verrière », « LA VERRIÈRE » → « verriere » : pour reconnaître la salle saisie en texte
// libre dans l'agenda de la saison.
const cleLieu = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/^(la|le|les|l) /, "")
    .trim();

// La salle à convention d'un événement de l'agenda, d'après son lieu précis (et sa commune
// quand elle est indiquée, pour départager deux « Salle des fêtes »).
export function salleDuLieu<S extends { nom: string; commune: string }>(
  lieuPrecis: string | null,
  commune: string | null,
  salles: S[]
): S | null {
  if (!lieuPrecis?.trim()) return null;
  const memeNom = salles.filter((s) => cleLieu(s.nom) === cleLieu(lieuPrecis));
  if (commune) {
    const memeCommune = memeNom.filter((s) => cleLieu(s.commune) === cleLieu(commune));
    if (memeCommune.length > 0) return memeCommune[0];
  }
  return memeNom.length === 1 ? memeNom[0] : null;
}
