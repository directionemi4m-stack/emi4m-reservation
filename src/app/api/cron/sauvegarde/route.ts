import { NextResponse } from "next/server";
import { lancerSauvegarde } from "@/lib/sauvegardeServeur";

export const maxDuration = 300;

// Appelée chaque dimanche à l'aube par Vercel Cron (cf. vercel.json) : copie complète de la
// base dans le Drive, dossier « Sauvegardes de l'appli ».
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Non autorisé", { status: 401 });
  }
  const domaine = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const base = domaine ? `https://${domaine}` : new URL(request.url).origin;
  const r = await lancerSauvegarde(base);
  return NextResponse.json(r, { status: r.ok ? 200 : 500 });
}
