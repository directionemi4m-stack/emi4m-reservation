import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { pdfBulletinActuel } from "@/lib/bulletinsChamServeur";

// Le bulletin tel qu'il partirait maintenant (état à jour), pour le relire avant l'envoi.
// Réservé à la direction : il réunit les signatures de tous les profs.
export async function GET(requete: NextRequest, { params }: { params: Promise<{ eleveId: string }> }) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return new NextResponse("Accès réservé à la direction.", { status: 403 });
  const { eleveId } = await params;
  const anneeDebut = Number(requete.nextUrl.searchParams.get("annee"));
  const trimestre = Number(requete.nextUrl.searchParams.get("t"));
  if (!Number.isInteger(anneeDebut) || anneeDebut < 2000 || anneeDebut > 2100 || ![1, 2, 3].includes(trimestre)) {
    return new NextResponse("Trimestre invalide.", { status: 400 });
  }
  const fichier = await pdfBulletinActuel(eleveId, anneeDebut, trimestre);
  if (!fichier) return new NextResponse("Ce bulletin est encore vide.", { status: 404 });
  return new NextResponse(Buffer.from(fichier.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(fichier.nomFichier)}`,
      "Cache-Control": "no-store",
    },
  });
}
