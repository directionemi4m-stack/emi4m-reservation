import { NextResponse } from "next/server";
import { envoyerRappelsAppels } from "@/lib/appelsServeur";

// Appelée chaque matin par Vercel Cron (cf. vercel.json) : rappelle aux profs les séances
// passées depuis 3 jours dont l'appel n'est pas fait.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Non autorisé", { status: 401 });
  }
  const domaine = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const base = domaine ? `https://${domaine}` : new URL(request.url).origin;
  try {
    return NextResponse.json(await envoyerRappelsAppels(base));
  } catch (erreur) {
    console.error("Rappels des appels en échec :", erreur);
    return NextResponse.json({ erreur: "Envoi impossible" }, { status: 500 });
  }
}
