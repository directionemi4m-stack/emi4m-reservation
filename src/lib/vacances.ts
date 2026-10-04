import { db } from "@/lib/db";

// Calendrier scolaire officiel (Ministère de l'Éducation nationale), ouvert sur
// data.education.gouv.fr — cf. https://data.education.gouv.fr/explore/assets/fr-en-calendrier-scolaire/
const API_URL = "https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records";

interface EnregistrementApi {
  description: string;
  start_date: string;
  end_date: string;
}

// Les dates renvoyées par l'API sont des instants UTC calés sur minuit heure de Paris
// (ex. 2026-10-16T22:00:00Z = 17/10/2026 00:00 à Paris, en heure d'été) : on reconvertit
// vers le fuseau de Paris pour récupérer le vrai jour calendaire, peu importe l'heure d'été/hiver.
function versDateLocaleParis(iso: string): Date {
  const date = new Date(iso);
  const formatteur = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [annee, mois, jour] = formatteur.format(date).split("-").map(Number);
  return new Date(Date.UTC(annee, mois - 1, jour));
}

// Synchronise les vacances scolaires officielles de la zone A (académie de Grenoble)
// depuis le calendrier publié par le Ministère. Les périodes déjà présentes (même nom,
// même début) sont mises à jour si la date de reprise a changé ; toute période ajoutée
// à la main (ex. un pont décidé par l'école, absent du calendrier officiel) n'est jamais
// touchée, puisqu'elle ne correspondra à aucune entrée renvoyée par l'API.
export async function synchroniserVacancesOfficielles(): Promise<{ ajoutees: number; misesAJour: number }> {
  // Sans filtre de date, l'API renvoie tout son historique depuis 2017 : on ne garde
  // que les périodes pas encore terminées (une marge d'un mois avant aujourd'hui, pour
  // ne pas perdre une période en cours).
  const margeDebut = new Date();
  margeDebut.setUTCMonth(margeDebut.getUTCMonth() - 1);
  const params = new URLSearchParams({
    where: `location="Grenoble" and population!="Enseignants" and end_date>="${margeDebut.toISOString()}"`,
    limit: "100",
  });
  const reponse = await fetch(`${API_URL}?${params}`);
  if (!reponse.ok) {
    throw new Error(`API calendrier scolaire indisponible (code ${reponse.status}).`);
  }
  const donnees = (await reponse.json()) as { results: EnregistrementApi[] };

  let ajoutees = 0;
  let misesAJour = 0;

  for (const r of donnees.results) {
    const nom = r.description;
    const debut = versDateLocaleParis(r.start_date);
    const fin = versDateLocaleParis(r.end_date);
    if (fin <= debut) continue; // ex. jour férié isolé (Ascension) sans vraie fermeture

    const existante = await db.periodeVacances.findFirst({ where: { nom, debut } });
    if (!existante) {
      await db.periodeVacances.create({ data: { nom, debut, fin } });
      ajoutees++;
    } else if (existante.fin.getTime() !== fin.getTime()) {
      await db.periodeVacances.update({ where: { id: existante.id }, data: { fin } });
      misesAJour++;
    }
  }

  return { ajoutees, misesAJour };
}
