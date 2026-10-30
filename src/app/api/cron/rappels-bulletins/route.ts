import { NextResponse } from "next/server";
import { envoyerRappelsBulletins } from "@/lib/bulletinsChamServeur";

// Appelée chaque matin par Vercel Cron (cf. vercel.json) : ne fait quelque chose que les
// jours de rappel des bulletins CHAM (le 15 novembre, février et mai, puis 4 jours après).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  const domaine = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const base = domaine ? `https://${domaine}` : new URL(request.url).origin;

  try {
    return NextResponse.json(await envoyerRappelsBulletins(new Date(), base));
  } catch (erreur) {
    console.error("Rappels des bulletins CHAM en échec :", erreur);
    return NextResponse.json({ erreur: "Envoi impossible" }, { status: 500 });
  }
}
