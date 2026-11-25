import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Facture du service de santé au travail : direction seulement.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return new NextResponse("Introuvable.", { status: 404 });
  const { id } = await params;
  const f = await db.factureSante.findUnique({ where: { id }, select: { pdf: true, nomFichier: true } });
  if (!f) return new NextResponse("Introuvable.", { status: 404 });
  return new NextResponse(Buffer.from(f.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(f.nomFichier)}`,
      "Cache-Control": "no-store",
    },
  });
}
