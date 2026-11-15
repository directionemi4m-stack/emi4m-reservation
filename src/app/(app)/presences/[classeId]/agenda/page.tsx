import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { anneeScolaireDebut } from "@/lib/fraisRecap";
import { CalendrierAgenda } from "@/components/presences/CalendrierAgenda";

const INDEX_JOUR: Record<string, number> = { LUNDI: 0, MARDI: 1, MERCREDI: 2, JEUDI: 3, VENDREDI: 4, SAMEDI: 5, DIMANCHE: 6 };
const iso = (d: Date) => d.toISOString().slice(0, 10);
// Aujourd'hui (lu à chaque requête : la page est dynamique).
const aujourdHui = () => iso(new Date());

// Agenda de l'année d'un ensemble (chorale, orchestre…) : le prof coche ses dates.
export default async function AgendaEnsemblePage({
  params,
  searchParams,
}: {
  params: Promise<{ classeId: string }>;
  searchParams: Promise<{ retirees?: string }>;
}) {
  const { classeId } = await params;
  const { retirees } = await searchParams;
  const session = await auth();
  const classe = await db.classe.findUnique({ where: { id: classeId } });
  if (!classe) notFound();
  if (classe.profId !== session!.user.id && session!.user.role !== "ADMIN") notFound();

  const jour = aujourdHui();
  const saison = anneeScolaireDebut(new Date(`${jour}T00:00:00.000Z`));
  const periode = { gte: new Date(Date.UTC(saison, 8, 1)), lt: new Date(Date.UTC(saison + 1, 7, 1)) };
  const [seances, vacances, feries] = await Promise.all([
    db.seance.findMany({
      where: { classeId, date: periode },
      select: { id: true, date: true, pointage: { select: { id: true } }, absenceProf: { select: { id: true } } },
      orderBy: { date: "asc" },
    }),
    db.periodeVacances.findMany({ where: { fin: { gte: periode.gte }, debut: { lt: periode.lt } } }),
    db.jourFerie.findMany({ where: { date: periode } }),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div>
        <Link href={`/presences/${classeId}`} className="text-sm text-brand-accent hover:underline">
          ‹ {classe.emoji} {classe.nom}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-brand-slate">
          Agenda de l&apos;année {saison}-{saison + 1}
        </h1>
        <p className="text-sm text-slate-500">
          Touchez une date pour l&apos;ajouter, touchez-la à nouveau pour l&apos;enlever, puis enregistrez. Vous pouvez revenir ici à
          tout moment de l&apos;année. Une date où l&apos;appel est fait reste verrouillée.
        </p>
        {!classe.agendaLibre && (
          <p className="mt-2 rounded-md bg-status-attente/10 p-2 text-xs text-slate-600">
            Ce cours a une séance chaque semaine. Pour un ensemble, cochez « agenda à la carte » dans « Modifier le cours ».
          </p>
        )}
        {retirees && Number(retirees) > 0 && (
          <p className="mt-2 rounded-md bg-brand-accent/10 p-2 text-xs text-slate-600">
            Les {retirees} séances hebdomadaires à venir ont été retirées : cochez maintenant les vraies dates de l&apos;ensemble.
          </p>
        )}
      </div>
      <CalendrierAgenda
        classeId={classeId}
        saison={saison}
        jourHabituel={classe.jourSemaine ? INDEX_JOUR[classe.jourSemaine] : null}
        seances={seances.map((s) => ({ id: s.id, date: iso(s.date), verrouillee: !!s.pointage || !!s.absenceProf }))}
        vacances={vacances.map((v) => ({ debut: iso(v.debut), fin: iso(v.fin) }))}
        feries={feries.map((f) => iso(f.date))}
        aujourdHui={jour}
      />
    </div>
  );
}
