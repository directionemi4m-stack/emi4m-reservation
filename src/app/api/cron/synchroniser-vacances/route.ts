import { NextResponse } from "next/server";
import { synchroniserVacancesOfficielles } from "@/lib/vacances";

// Appelée chaque semaine par Vercel Cron (cf. vercel.json). Vercel joint automatiquement
// « Authorization: Bearer <CRON_SECRET> » : sans ce secret, personne d'autre ne peut la déclencher.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  try {
    const resultat = await synchroniserVacancesOfficielles();
    return NextResponse.json(resultat);
  } catch (erreur) {
    console.error("Synchronisation planifiée des vacances scolaires en échec :", erreur);
    return NextResponse.json({ erreur: "Synchronisation impossible" }, { status: 500 });
  }
}
