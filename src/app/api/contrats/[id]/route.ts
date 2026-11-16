import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { chargerContrat, pdfContrat } from "@/lib/contratsServeur";

// Un contrat ou avenant dans son état du moment : pour la direction, ou pour le prof concerné
// une fois signé par la présidence.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Non connecté.", { status: 401 });
  const { id } = await params;
  const c = await chargerContrat(id);
  const autorise = c && (session.user.role === "ADMIN" || (c.profId === session.user.id && (c.papier || c.presidenceSigneLe)));
  if (!c || !autorise) return new NextResponse("Introuvable.", { status: 404 });
  const { pdf, nomFichier } = await pdfContrat(c);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(nomFichier)}`,
      "Cache-Control": "no-store",
    },
  });
}
