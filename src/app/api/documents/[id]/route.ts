import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Le PDF en cours d'un document à signer, pour tout salarié connecté (à lire avant de signer).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new Response("Non autorisé", { status: 401 });

  const { id } = await params;
  const document = await db.documentASigner.findUnique({ where: { id }, select: { pdf: true, nomFichier: true } });
  if (!document) return new Response("Introuvable", { status: 404 });

  return new Response(Buffer.from(document.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(document.nomFichier)}`,
      "Cache-Control": "private, no-cache",
    },
  });
}
