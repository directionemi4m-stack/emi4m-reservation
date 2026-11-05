import Link from "next/link";
import { IconAlertTriangle } from "@tabler/icons-react";

export interface AppelAFaire {
  id: string;
  date: Date;
  enRetard: boolean;
  classe: { id: string; nom: string; emoji: string; prof: { prenom: string; nom: string } };
}

const date = (d: Date) => d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

// Les séances passées sans appel : pour le prof, les siennes ; pour la direction, celles en
// retard de tous les profs, regroupées par prof.
export function AppelsAFaire({ seances, tousLesProfs = false }: { seances: AppelAFaire[]; tousLesProfs?: boolean }) {
  if (seances.length === 0) return null;
  const groupes = new Map<string, AppelAFaire[]>();
  for (const s of seances) {
    const cle = tousLesProfs ? `${s.classe.prof.prenom} ${s.classe.prof.nom}` : "";
    groupes.set(cle, [...(groupes.get(cle) ?? []), s]);
  }
  return (
    <section className="mb-6 rounded-lg border border-status-attente/40 bg-status-attente/10 p-4">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-slate">
        <IconAlertTriangle size={18} className="text-status-attente" aria-hidden />
        {tousLesProfs
          ? `Appels en retard, tous les profs (${seances.length})`
          : `Appel${seances.length > 1 ? "s" : ""} à faire (${seances.length})`}
      </h2>
      {tousLesProfs && (
        <p className="mb-2 text-xs text-slate-500">Séances passées depuis 3 jours ou plus sans appel. Le prof reçoit un rappel (notification et mail) à 17 h.</p>
      )}
      <div className="flex flex-col gap-2">
        {[...groupes].map(([prof, liste]) => (
          <div key={prof}>
            {prof && <p className="text-xs font-semibold text-slate-600">{prof}</p>}
            <ul className="flex flex-wrap gap-2">
              {liste.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/presences/${s.classe.id}/${s.id}`}
                    className={`inline-block rounded-md border bg-white px-2 py-1 text-xs hover:border-brand-accent hover:text-brand-accent ${
                      s.enRetard ? "border-status-attente text-slate-700" : "border-slate-200 text-slate-600"
                    }`}
                  >
                    {s.classe.emoji} {s.classe.nom} · {date(s.date)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {!tousLesProfs && (
        <p className="mt-2 text-xs text-slate-500">Si un cours n&apos;a pas eu lieu, ouvre la séance et déclare « Absence du prof ».</p>
      )}
    </section>
  );
}
