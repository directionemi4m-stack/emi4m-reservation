import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Le PDF d'un document de l'école (règlement intérieur…), en lecture pour tout salarié connecté.
export async function GET(_request: Request, { params }: { params: Promise<{ cle: string }> }) {
  const session = await auth();
  if (!session?.user) return new Response("Non autorisé", { status: 401 });

  const { cle } = await params;
  const document = await db.documentEcole.findUnique({ where: { cle: cle.slice(0, 60) }, select: { pdf: true, nomFichier: true } });
  if (!document) return new Response("Introuvable", { status: 404 });

  return new Response(Buffer.from(document.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(document.nomFichier)}`,
      "Cache-Control": "private, no-cache",
    },
  });
}
