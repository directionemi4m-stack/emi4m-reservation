import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const LIBELLE_STATUT: Record<string, string> = {
  PRESENT: "Présent",
  ABSENT: "Absence injustifiée",
  EXCUSE: "Absence justifiée",
};

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  const estAdmin = session.user.role === "ADMIN";
  const pointages = await db.pointage.findMany({
    where: estAdmin ? {} : { profId: session.user.id },
    include: {
      seance: true,
      classe: { include: { niveauFM: true, lieu: true } },
      prof: true,
      marques: { include: { eleve: true } },
    },
    orderBy: { creeLe: "desc" },
  });

  const lignes: string[][] = [
    ["Date", "Enseignant", "Type", "Cours", "Niveau", "Lieu", "Élève", "Statut"],
  ];

  for (const pointage of pointages) {
    const dateStr = pointage.seance.date.toLocaleDateString("fr-FR");
    for (const marque of pointage.marques) {
      lignes.push([
        dateStr,
        `${pointage.prof.prenom} ${pointage.prof.nom}`,
        pointage.classe.type === "FM" ? "FM" : "Instrument",
        pointage.classe.nom,
        pointage.classe.niveauFM?.nom ?? "",
        pointage.classe.lieu?.nom ?? "",
        marque.eleve.nom,
        LIBELLE_STATUT[marque.statut] ?? marque.statut,
      ]);
    }
  }

  const csv = lignes
    .map((ligne) => ligne.map((cellule) => `"${cellule.replace(/"/g, '""')}"`).join(";"))
    .join("\n");

  const BOM = String.fromCharCode(0xfeff);
  return new NextResponse(BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="presences-emi4m.csv"',
    },
  });
}
