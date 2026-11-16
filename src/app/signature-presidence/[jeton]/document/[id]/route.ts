import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attendPresidence, lienPresidenceValide } from "@/lib/contratsServeur";

// Lecture d'un document à signer par la présidence, avec son lien (sans compte).
export async function GET(_request: Request, { params }: { params: Promise<{ jeton: string; id: string }> }) {
  const { jeton, id } = await params;
  if (!(await lienPresidenceValide(jeton))) return new NextResponse("Lien expiré.", { status: 404 });
  const c = await db.contratProf.findFirst({ where: { id, ...attendPresidence }, select: { pdf: true, nomFichier: true } });
  if (!c) return new NextResponse("Ce document n'est plus à signer.", { status: 404 });
  return new NextResponse(Buffer.from(c.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(c.nomFichier)}`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
