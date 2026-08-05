"use client";

import { useRouter, usePathname } from "next/navigation";

interface Commune {
  id: string;
  nom: string;
}

interface Salle {
  id: string;
  nom: string;
  communeId: string;
}

interface Props {
  communes: Commune[];
  salles: Salle[];
  semaine: string;
  communeSelectionnee?: string;
  salleSelectionnee?: string;
}

function ajouterJoursISO(dateISO: string, n: number): string {
  const date = new Date(`${dateISO}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

export function PlanningFiltres({
  communes,
  salles,
  semaine,
  communeSelectionnee,
  salleSelectionnee,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function naviguer(changements: {
    semaine?: string;
    commune?: string;
    salle?: string;
  }) {
    const parametres = new URLSearchParams();
    parametres.set("semaine", changements.semaine ?? semaine);

    const commune = "commune" in changements ? changements.commune : communeSelectionnee;
    const salle = "salle" in changements ? changements.salle : salleSelectionnee;

    if (commune) parametres.set("commune", commune);
    if (salle) parametres.set("salle", salle);

    router.push(`${pathname}?${parametres.toString()}`);
  }

  const sallesFiltrees = communeSelectionnee
    ? salles.filter((s) => s.communeId === communeSelectionnee)
    : salles;

  const debut = new Date(`${semaine}T00:00:00.000Z`);
  const fin = new Date(`${ajouterJoursISO(semaine, 6)}T00:00:00.000Z`);
  const libelleSemaine = `${debut.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – ${fin.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => naviguer({ semaine: ajouterJoursISO(semaine, -7) })}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
        >
          ←
        </button>
        <span className="text-sm font-medium text-slate-700">Semaine du {libelleSemaine}</span>
        <button
          type="button"
          onClick={() => naviguer({ semaine: ajouterJoursISO(semaine, 7) })}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
        >
          →
        </button>
      </div>

      <select
        value={communeSelectionnee ?? ""}
        onChange={(e) => naviguer({ commune: e.target.value || undefined, salle: undefined })}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
      >
        <option value="">Toutes les communes</option>
        {communes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nom}
          </option>
        ))}
      </select>

      <select
        value={salleSelectionnee ?? ""}
        onChange={(e) => naviguer({ salle: e.target.value || undefined })}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
      >
        <option value="">Toutes les salles</option>
        {sallesFiltrees.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nom}
          </option>
        ))}
      </select>
    </div>
  );
}
