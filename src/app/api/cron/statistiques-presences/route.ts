import { NextResponse } from "next/server";
import { synchroniserStatistiquesPresences } from "@/lib/sheets";

// Appelée chaque jour à 17 h par Vercel Cron (cf. vercel.json) : remet à jour les
// statistiques de présence du classeur, au cas où une mise à jour après un appel aurait
// échoué. Aucun rappel n'est envoyé aux profs.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Non autorisé", { status: 401 });
  }
  try {
    await synchroniserStatistiquesPresences();
    return NextResponse.json({ statistiques: "à jour" });
  } catch (erreur) {
    console.error("Statistiques de présence non mises à jour :", erreur);
    return NextResponse.json({ erreur: "Mise à jour impossible" }, { status: 500 });
  }
}
