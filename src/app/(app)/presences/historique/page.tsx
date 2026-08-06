import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PresencesSousNav } from "@/components/presences/PresencesSousNav";

function formatterDate(date: Date) {
  return date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

export default async function HistoriquePage() {
  const session = await auth();

  const pointages = await db.pointage.findMany({
    where: { profId: session!.user.id },
    include: { seance: true, classe: true, marques: true },
    orderBy: { creeLe: "desc" },
  });

  return (
    <div>
      <PresencesSousNav />
      <h1 className="text-xl font-semibold text-brand-slate">Historique</h1>

      {pointages.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">Pas encore de feuille enregistrée.</p>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {pointages.map((p) => {
          const present = p.marques.filter((m) => m.statut === "PRESENT").length;
          const excuse = p.marques.filter((m) => m.statut === "EXCUSE").length;
          const absent = p.marques.filter((m) => m.statut === "ABSENT").length;
          return (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm"
            >
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {p.classe.emoji} {p.classe.nom}
                </p>
                <p className="text-xs text-slate-500">
                  {formatterDate(p.seance.date)} · {p.marques.length} élève
                  {p.marques.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="text-status-dispo">{present} présents</span>
                <span className="text-status-attente">{excuse} excusés</span>
                <span className="text-status-occupee">{absent} absents</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
