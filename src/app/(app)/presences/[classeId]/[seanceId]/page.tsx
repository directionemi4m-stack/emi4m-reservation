import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SeanceContent } from "@/components/presences/SeanceContent";
import type { StatutPresence } from "@/generated/prisma/client";

export default async function SeancePage({
  params,
}: {
  params: Promise<{ classeId: string; seanceId: string }>;
}) {
  const { classeId, seanceId } = await params;
  const session = await auth();

  const classe = await db.classe.findUnique({
    where: { id: classeId },
    include: { eleves: { where: { actif: true }, orderBy: { nom: "asc" } } },
  });
  if (!classe) notFound();
  if (classe.profId !== session!.user.id && session!.user.role !== "ADMIN") notFound();

  const seance = await db.seance.findUnique({
    where: { id: seanceId },
    include: { pointage: { include: { marques: true } }, absenceProf: true },
  });
  if (!seance || seance.classeId !== classeId) notFound();

  const marquesExistantes: Record<string, StatutPresence> = {};
  seance.pointage?.marques.forEach((m) => {
    marquesExistantes[m.eleveId] = m.statut;
  });

  const absenceExistante = seance.absenceProf
    ? {
        type: seance.absenceProf.type,
        dateRattrapage: seance.absenceProf.dateRattrapage?.toISOString().slice(0, 10) ?? null,
        commentaire: seance.absenceProf.commentaire,
      }
    : null;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/presences/${classeId}`} className="text-sm text-brand-accent hover:underline">
        ‹ {classe.emoji} {classe.nom}
      </Link>
      <h1 className="mt-1 mb-6 text-xl font-semibold text-brand-slate">
        {seance.date.toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </h1>
      <SeanceContent
        classeId={classeId}
        seanceId={seanceId}
        eleves={classe.eleves}
        marquesExistantes={marquesExistantes}
        absenceExistante={absenceExistante}
      />
    </div>
  );
}
