import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pdfAttestation } from "@/lib/attestationAchatServeur";

// L'attestation de vente pré-remplie, à imprimer et faire signer (direction).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return new NextResponse("Accès réservé à la direction.", { status: 403 });
  const { id } = await params;
  const fichier = await pdfAttestation(id);
  if (!fichier) return new NextResponse("Introuvable.", { status: 404 });
  return new NextResponse(Buffer.from(fichier.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(fichier.nomFichier)}`,
      "Cache-Control": "no-store",
    },
  });
}
