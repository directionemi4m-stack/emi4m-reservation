import { NextResponse } from "next/server";
import { envoyerRappelsFactures } from "@/lib/rappelsFacturesServeur";

// Appelée chaque matin par Vercel Cron (cf. vercel.json) : rappelle à la direction les
// factures d'achat pas encore payées 7 jours après leur ajout.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Non autorisé", { status: 401 });
  }
  const domaine = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const base = domaine ? `https://${domaine}` : new URL(request.url).origin;
  try {
    return NextResponse.json(await envoyerRappelsFactures(base));
  } catch (erreur) {
    console.error("Rappels des factures en échec :", erreur);
    return NextResponse.json({ erreur: "Envoi impossible" }, { status: 500 });
  }
}
