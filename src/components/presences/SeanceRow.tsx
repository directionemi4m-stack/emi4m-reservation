"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { modifierDateSeance, type EtatAction } from "@/app/(app)/presences/[classeId]/actions";

const etatInitial: EtatAction = { succes: true };

function formatterDateLongue(date: Date) {
  return date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

export function SeanceRow({
  classeId,
  seanceId,
  date,
  numero,
  fait,
  prochaine,
}: {
  classeId: string;
  seanceId: string;
  date: Date;
  numero: number;
  fait: boolean;
  prochaine: boolean;
}) {
  const [etat, action, enCours] = useActionState(modifierDateSeance, etatInitial);
  const [modifier, setModifier] = useState(false);

  return (
    <div
      className={`flex items-center gap-3 rounded-lg p-3 ${
        fait ? "bg-status-dispo/10" : prochaine ? "bg-brand-accent/10" : "bg-white"
      } shadow-sm`}
    >
      <span className="w-6 text-center text-xs font-semibold text-slate-400">{numero}</span>

      {!modifier ? (
        <>
          <Link href={`/presences/${classeId}/${seanceId}`} className="flex-1">
            <p className="text-sm font-medium text-slate-700">{formatterDateLongue(date)}</p>
            <p className="text-xs text-slate-500">
              {fait ? "✓ Appel fait" : prochaine ? "Prochaine séance" : "À venir"}
            </p>
          </Link>
          <button
            type="button"
            onClick={() => setModifier(true)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
            title="Modifier la date"
          >
            📅
          </button>
        </>
      ) : (
        <form action={action} className="flex flex-1 flex-wrap items-center gap-2">
          <input type="hidden" name="classeId" value={classeId} />
          <input type="hidden" name="seanceId" value={seanceId} />
          <input
            type="date"
            name="date"
            defaultValue={date.toISOString().slice(0, 10)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            disabled={enCours}
            onClick={() => setModifier(false)}
            className="rounded-md bg-brand-accent px-3 py-1 text-xs font-semibold text-white hover:bg-brand-accent/90"
          >
            Enregistrer
          </button>
          <button
            type="button"
            onClick={() => setModifier(false)}
            className="text-xs text-slate-500 hover:underline"
          >
            Annuler
          </button>
        </form>
      )}
      {etat.message && <p className="text-xs text-status-occupee">{etat.message}</p>}
    </div>
  );
}
