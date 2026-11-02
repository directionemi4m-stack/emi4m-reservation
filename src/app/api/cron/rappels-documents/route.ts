import { NextResponse } from "next/server";
import { envoyerRelancesDocuments } from "@/lib/documentsSignesServeur";

// Appelée chaque matin par Vercel Cron (cf. vercel.json) : relance une semaine après la
// publication ceux qui n'ont pas encore signé un document.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  const domaine = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const base = domaine ? `https://${domaine}` : new URL(request.url).origin;

  try {
    return NextResponse.json(await envoyerRelancesDocuments(new Date(), base));
  } catch (erreur) {
    console.error("Relances des documents à signer en échec :", erreur);
    return NextResponse.json({ erreur: "Envoi impossible" }, { status: 500 });
  }
}
