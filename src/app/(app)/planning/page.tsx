import { db } from "@/lib/db";
import { PlanningFiltres } from "@/components/planning/PlanningFiltres";
import { SalleTimeline } from "@/components/planning/SalleTimeline";
import {
  ajouterJours,
  axeHoraire,
  chargerOccupation,
  lireParamDate,
  lundiDe,
  versParamDate,
} from "@/lib/planning";

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ semaine?: string; commune?: string; salle?: string }>;
}) {
  const params = await searchParams;

  const lundi = lundiDe(lireParamDate(params.semaine) ?? new Date());
  const jours = Array.from({ length: 7 }, (_, i) => ajouterJours(lundi, i));
  const dimanche = jours[6];

  const [communes, sallesToutes] = await Promise.all([
    db.commune.findMany({ orderBy: { nom: "asc" } }),
    db.salle.findMany({
      where: { actif: true },
      include: { commune: true },
      orderBy: [{ commune: { nom: "asc" } }, { nom: "asc" }],
    }),
  ]);

  const salles = sallesToutes.filter((s) => {
    if (params.salle) return s.id === params.salle;
    if (params.commune) return s.communeId === params.commune;
    return true;
  });

  const blocs = await chargerOccupation(
    salles.map((s) => s.id),
    lundi,
    dimanche
  );
  const { min: heureMinAxe, max: heureMaxAxe } = axeHoraire(blocs);
  const semaine = versParamDate(lundi);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-brand-slate">Planning des salles</h1>

      <PlanningFiltres
        communes={communes}
        salles={sallesToutes.map((s) => ({ id: s.id, nom: s.nom, communeId: s.communeId }))}
        semaine={semaine}
        communeSelectionnee={params.commune}
        salleSelectionnee={params.salle}
      />

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
        <span className="text-slate-400">
          Touchez une salle ou un jour pour en voir le détail.
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {salles.map((salle) => (
          <SalleTimeline
            key={salle.id}
            salle={salle}
            jours={jours}
            blocs={blocs.filter((b) => b.salleId === salle.id)}
            heureMinAxe={heureMinAxe}
            heureMaxAxe={heureMaxAxe}
            semaine={semaine}
          />
        ))}
        {salles.length === 0 && (
          <p className="text-sm text-slate-500">Aucune salle ne correspond à ce filtre.</p>
        )}
      </div>
    </div>
  );
}
