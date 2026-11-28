import { NextResponse } from "next/server";
import { envoyerRappelsEvenements } from "@/lib/rappelsEvenementsServeur";

// Appelée chaque matin par Vercel Cron (cf. vercel.json) : notifie la direction du matériel
// à préparer (2 jours avant) et des clés à récupérer (la veille) des événements de la saison.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Non autorisé", { status: 401 });
  }
  try {
    return NextResponse.json(await envoyerRappelsEvenements());
  } catch (erreur) {
    console.error("Rappels des événements en échec :", erreur);
    return NextResponse.json({ erreur: "Envoi impossible" }, { status: 500 });
  }
}
