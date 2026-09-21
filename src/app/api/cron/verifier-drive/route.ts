import { NextResponse } from "next/server";
import { surveillerConnexionDrive } from "@/lib/drive";

// Appelée chaque matin par Vercel Cron (cf. vercel.json). Vercel joint automatiquement
// « Authorization: Bearer <CRON_SECRET> » : sans ce secret, personne d'autre ne peut la déclencher.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  // Lien stable vers la page admin (le cron peut être appelé via une URL de déploiement).
  const domaine = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const base = domaine ? `https://${domaine}` : new URL(request.url).origin;

  try {
    const etat = await surveillerConnexionDrive(`${base}/admin/parametres/google-drive`);
    return NextResponse.json({ statut: etat.statut });
  } catch (erreur) {
    console.error("Vérification planifiée de la connexion Drive en échec :", erreur);
    return NextResponse.json({ erreur: "Vérification impossible" }, { status: 500 });
  }
}
