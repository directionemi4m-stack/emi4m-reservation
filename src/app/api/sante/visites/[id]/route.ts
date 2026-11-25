import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Attestation d'une visite : pour la direction, ou pour le salarié concerné.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Non connecté.", { status: 401 });
  const { id } = await params;
  const v = await db.visiteMedicale.findUnique({ where: { id }, select: { pdf: true, nomFichier: true, salarie: { select: { userId: true } } } });
  const autorise = v?.pdf && (session.user.role === "ADMIN" || v.salarie.userId === session.user.id);
  if (!v?.pdf || !autorise) return new NextResponse("Introuvable.", { status: 404 });
  return new NextResponse(Buffer.from(v.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(v.nomFichier ?? "Attestation.pdf")}`,
      "Cache-Control": "no-store",
    },
  });
}
