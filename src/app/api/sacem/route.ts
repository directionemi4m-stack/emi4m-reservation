import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { lireCoordonnees } from "@/lib/coordonneesServeur";
import { genererReleveSacem } from "@/lib/recapSacemPdf";
import { saisonARentrer } from "@/lib/rentree";
import { evenementsSacem, lirePeriode, versReleve } from "@/lib/sacemServeur";

// Le relevé des programmes en PDF, à transmettre à la SACEM (direction seulement).
export async function GET(request: Request) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return new NextResponse("Accès réservé à la direction.", { status: 403 });
  const p = new URL(request.url).searchParams;
  const { debut, fin, finIncluse } = lirePeriode(p.get("debut"), p.get("fin"), saisonARentrer(new Date()));
  const [coordonnees, evenements] = await Promise.all([lireCoordonnees(), evenementsSacem(debut, fin)]);
  // Seules les représentations dont le programme a été saisi figurent sur le relevé.
  const avecProgramme = evenements.filter((e) => e.inscriptions.length > 0);
  const octets = await genererReleveSacem({ coordonnees, debut, finIncluse, evenements: avecProgramme.map(versReleve) });
  const jour = (d: Date) => d.toISOString().slice(0, 10);
  return new NextResponse(Buffer.from(octets), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="releve-programmes-${coordonnees.sigle.toLowerCase()}-${jour(debut)}-${jour(finIncluse)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
