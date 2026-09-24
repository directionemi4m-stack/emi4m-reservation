import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SalleTimeline } from "@/components/planning/SalleTimeline";
import {
  ajouterJours,
  axeHoraire,
  chargerOccupation,
  lireParamDate,
  lundiDe,
  versParamDate,
} from "@/lib/planning";

const formatCourt = (d: Date) =>
  d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function SalleSemainePage({
  params,
  searchParams,
}: {
  params: Promise<{ salleId: string }>;
  searchParams: Promise<{ semaine?: string }>;
}) {
  const { salleId } = await params;
  const { semaine: semaineParam } = await searchParams;

  const salle = await db.salle.findUnique({ where: { id: salleId }, include: { commune: true } });
  if (!salle || !salle.actif) notFound();

  const lundi = lundiDe(lireParamDate(semaineParam) ?? new Date());
  const jours = Array.from({ length: 7 }, (_, i) => ajouterJours(lundi, i));
  const semaine = versParamDate(lundi);

  const blocs = await chargerOccupation([salle.id], lundi, jours[6]);
  const { min, max } = axeHoraire(blocs);

  const lienNav = "rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={`/planning?semaine=${semaine}`} className="text-sm text-brand-accent hover:underline">
          ← Planning des salles
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-brand-slate">
          {salle.commune.nom} — {salle.nom}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <Link href={`?semaine=${versParamDate(ajouterJours(lundi, -7))}`} className={lienNav}>
          ←
        </Link>
        <span className="text-sm text-slate-600">
          Semaine du {formatCourt(lundi)} au {formatCourt(jours[6])}
        </span>
        <Link href={`?semaine=${versParamDate(ajouterJours(lundi, 7))}`} className={lienNav}>
          →
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-status-dispo/20" /> Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-brand-slate" /> Cours récurrent
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-status-occupee" /> Réservation validée
        </span>
        <span className="text-slate-400">Touchez un jour pour le détail de la journée.</span>
      </div>

      <SalleTimeline
        salle={salle}
        jours={jours}
        blocs={blocs}
        heureMinAxe={min}
        heureMaxAxe={max}
        semaine={semaine}
        taille="large"
      />
    </div>
  );
}
