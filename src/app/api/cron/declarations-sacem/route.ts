import { NextResponse } from "next/server";
import { envoyerDeclarationsDuJour } from "@/lib/declarationSacemServeur";

// Appelée chaque matin par Vercel Cron (cf. vercel.json) : envoie à la direction la
// déclaration SACEM des représentations de la veille, et la range dans le Drive.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Non autorisé", { status: 401 });
  }
  const domaine = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const base = domaine ? `https://${domaine}` : new URL(request.url).origin;
  try {
    return NextResponse.json(await envoyerDeclarationsDuJour(base));
  } catch (erreur) {
    console.error("Déclarations SACEM en échec :", erreur);
    return NextResponse.json({ erreur: "Envoi impossible" }, { status: 500 });
  }
}
