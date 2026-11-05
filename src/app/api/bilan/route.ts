import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { bilanEnCsv } from "@/lib/bilan";
import { calculerBilan } from "@/lib/bilanServeur";
import { saisonARentrer } from "@/lib/rentree";

// Le bilan de la saison en fichier pour Excel (direction seulement).
export async function GET(request: Request) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return new NextResponse("Accès réservé à la direction.", { status: 403 });
  const param = new URL(request.url).searchParams.get("saison") ?? "";
  const saison = /^\d{4}$/.test(param) ? Number(param) : saisonARentrer(new Date());
  const { libelle, sections } = await calculerBilan(saison);
  return new NextResponse(bilanEnCsv(`Bilan de la saison ${libelle} — EMI4M`, sections), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bilan-emi4m-${libelle}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
