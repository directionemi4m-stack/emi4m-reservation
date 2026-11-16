import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pdfDevis, pdfFacture } from "@/lib/devisServeur";

// Le PDF d'un devis (ou d'une facture avec ?type=facture), généré à la demande (direction).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return new NextResponse("Accès réservé à la direction.", { status: 403 });
  const { id } = await params;
  const facture = new URL(request.url).searchParams.get("type") === "facture";
  const fichier = facture ? await pdfFacture(id) : await pdfDevis(id);
  if (!fichier) return new NextResponse("Introuvable.", { status: 404 });
  return new NextResponse(Buffer.from(fichier.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(fichier.nomFichier)}`,
      "Cache-Control": "no-store",
    },
  });
}
