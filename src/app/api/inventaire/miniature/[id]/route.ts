import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Miniature d'une photo d'inventaire, servie depuis la base (l'original est dans le Drive
// de la direction, inaccessible directement depuis l'appli). Réservée à la direction.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return new Response("Non autorisé", { status: 401 });

  const { id } = await params;
  const photo = await db.photoInventaire.findUnique({ where: { id }, select: { miniature: true } });
  if (!photo) return new Response("Introuvable", { status: 404 });

  return new Response(Buffer.from(photo.miniature), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=604800, immutable" },
  });
}
