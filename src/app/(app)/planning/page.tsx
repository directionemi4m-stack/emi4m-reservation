import { db } from "@/lib/db";
import { PlanningFiltres } from "@/components/planning/PlanningFiltres";
import { SalleTimeline } from "@/components/planning/SalleTimeline";

function lundiDe(date: Date): Date {
  const jour = date.getUTCDay();
  const decalage = (jour + 6) % 7; // jours écoulés depuis lundi
  const lundi = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  lundi.setUTCDate(lundi.getUTCDate() - decalage);
  return lundi;
}

function ajouterJours(date: Date, n: number): Date {
  const resultat = new Date(date);
  resultat.setUTCDate(resultat.getUTCDate() + n);
  return resultat;
}

function versParamDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function heureDecimale(date: Date) {
  return date.getUTCHours() + date.getUTCMinutes() / 60;
}

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ semaine?: string; commune?: string; salle?: string }>;
}) {
  const params = await searchParams;

  const semaineDemandee = params.semaine ? new Date(`${params.semaine}T00:00:00.000Z`) : null;
  const lundi =
    semaineDemandee && !Number.isNaN(semaineDemandee.getTime())
      ? lundiDe(semaineDemandee)
      : lundiDe(new Date());
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

  const salleIds = salles.map((s) => s.id);

  const [creneauxRecurrents, reservationsValidees] = await Promise.all([
    salleIds.length
      ? db.creneauRecurrent.findMany({
          where: {
            salleId: { in: salleIds },
            actif: true,
            dateDebut: { lte: dimanche },
            OR: [{ dateFin: null }, { dateFin: { gte: lundi } }],
          },
        })
      : Promise.resolve([]),
    salleIds.length
      ? db.demandeCreneau.findMany({
          where: {
            salleId: { in: salleIds },
            statut: "VALIDEE",
            date: { gte: lundi, lte: dimanche },
          },
          include: { demande: { include: { prof: true } } },
        })
      : Promise.resolve([]),
  ]);

  let heureMinAxe = 8;
  let heureMaxAxe = 20;
  for (const c of creneauxRecurrents) {
    heureMinAxe = Math.min(heureMinAxe, Math.floor(heureDecimale(c.heureDebut)));
    heureMaxAxe = Math.max(heureMaxAxe, Math.ceil(heureDecimale(c.heureFin)));
  }
  for (const r of reservationsValidees) {
    heureMinAxe = Math.min(heureMinAxe, Math.floor(heureDecimale(r.heureDebut)));
    heureMaxAxe = Math.max(heureMaxAxe, Math.ceil(heureDecimale(r.heureFin)));
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-brand-slate">Planning des salles</h1>

      <PlanningFiltres
        communes={communes}
        salles={sallesToutes.map((s) => ({ id: s.id, nom: s.nom, communeId: s.communeId }))}
        semaine={versParamDate(lundi)}
        communeSelectionnee={params.commune}
        salleSelectionnee={params.salle}
      />

      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-status-dispo/20" /> Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-brand-slate" /> Cours récurrent
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-status-occupee" /> Réservation validée
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {salles.map((salle) => (
          <SalleTimeline
            key={salle.id}
            salle={salle}
            jours={jours}
            creneauxRecurrents={creneauxRecurrents.filter((c) => c.salleId === salle.id)}
            reservationsValidees={reservationsValidees.filter((r) => r.salleId === salle.id)}
            heureMinAxe={heureMinAxe}
            heureMaxAxe={heureMaxAxe}
          />
        ))}
        {salles.length === 0 && (
          <p className="text-sm text-slate-500">Aucune salle ne correspond à ce filtre.</p>
        )}
      </div>
    </div>
  );
}
