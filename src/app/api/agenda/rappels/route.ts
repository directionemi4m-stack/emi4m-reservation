import { db } from "@/lib/db";
import { agendaRappelsIcs, jetonAgendaValide } from "@/lib/agendaRappelsIcs";

export const dynamic = "force-dynamic";

// Agenda « Rappels EMI4M » lu par Google Agenda (abonnement par URL) : sans session, protégé
// par le jeton secret de l'adresse (cf. jetonAgendaRappels). Événements des 30 derniers jours
// et à venir.
export async function GET(request: Request) {
  const secret = process.env.AUTH_SECRET;
  const url = new URL(request.url);
  if (!secret || !jetonAgendaValide(url.searchParams.get("jeton"), secret)) {
    return new Response("Non autorisé", { status: 401 });
  }
  const depuis = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const evenements = await db.evenementSaison.findMany({
    where: { date: { gte: depuis } },
    select: { id: true, titre: true, date: true, heureDebutMinutes: true, lieuPrecis: true, lieu: { select: { nom: true } } },
    orderBy: { date: "asc" },
  });
  const domaine = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const base = domaine ? `https://${domaine}` : url.origin;
  const ics = agendaRappelsIcs(evenements.map((e) => ({ ...e, lieuNom: e.lieu?.nom ?? null })), new Date(), base);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="rappels-emi4m.ics"',
      "Cache-Control": "no-cache",
    },
  });
}
