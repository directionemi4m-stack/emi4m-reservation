import { NextResponse } from "next/server";
import { envoyerRappelsAppels } from "@/lib/appelsServeur";
import { synchroniserStatistiquesPresences } from "@/lib/sheets";

// Appelée chaque jour à 17 h par Vercel Cron (cf. vercel.json) : rappelle aux profs les séances
// passées depuis 3 jours dont l'appel n'est pas fait, puis remet à jour les statistiques de
// présence du classeur (au cas où une mise à jour après un appel aurait échoué).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Non autorisé", { status: 401 });
  }
  const domaine = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const base = domaine ? `https://${domaine}` : new URL(request.url).origin;
  try {
    const rappels = await envoyerRappelsAppels(base);
    let statistiques = "à jour";
    try {
      await synchroniserStatistiquesPresences();
    } catch (erreur) {
      console.error("Statistiques de présence non mises à jour :", erreur);
      statistiques = "échec";
    }
    return NextResponse.json({ ...rappels, statistiques });
  } catch (erreur) {
    console.error("Rappels des appels en échec :", erreur);
    return NextResponse.json({ erreur: "Envoi impossible" }, { status: 500 });
  }
}
