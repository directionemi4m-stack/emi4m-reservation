import { db } from "@/lib/db";

function formatDateHeure(date: Date) {
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function JournalImpersonationPage() {
  const entrees = await db.journalImpersonation.findMany({
    orderBy: { demarreLe: "desc" },
    take: 100,
    include: {
      direction: { select: { nom: true, prenom: true } },
      cible: { select: { nom: true, prenom: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Journal « Se connecter en tant que »</h1>
        <p className="text-sm text-slate-500">
          Les 100 dernières connexions en tant qu&apos;un collègue, pour la traçabilité.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Direction</th>
              <th className="px-4 py-2 font-medium">Connecté·e en tant que</th>
              <th className="px-4 py-2 font-medium">Démarré le</th>
              <th className="px-4 py-2 font-medium">Terminé le</th>
            </tr>
          </thead>
          <tbody>
            {entrees.map((e) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-700">
                  {e.direction.prenom} {e.direction.nom}
                </td>
                <td className="px-4 py-2 text-slate-700">
                  {e.cible.prenom} {e.cible.nom}
                </td>
                <td className="px-4 py-2 text-slate-500">{formatDateHeure(e.demarreLe)}</td>
                <td className="px-4 py-2 text-slate-500">
                  {e.termineLe ? (
                    formatDateHeure(e.termineLe)
                  ) : (
                    <span className="rounded-full bg-status-attente/15 px-2.5 py-0.5 text-xs font-medium text-status-attente">
                      En cours
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {entrees.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-sm text-slate-500" colSpan={4}>
                  Aucune connexion en tant qu&apos;un collègue pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
