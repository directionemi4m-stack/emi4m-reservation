"use client";

import { useActionState } from "react";
import { traiterIdee, type EtatAction } from "@/app/(app)/admin/idees/actions";
import { LIBELLE_STATUT_IDEE, REPONSE_MAX } from "@/lib/idees";

// Statut et réponse de la direction à une idée.
export function TraitementIdee({ id, statut, reponse, anonyme }: { id: string; statut: string; reponse: string; anonyme: boolean }) {
  const [etat, action, enCours] = useActionState(traiterIdee, { succes: true } as EtatAction);
  return (
    <form action={action} className="flex flex-col gap-2 rounded-md bg-slate-50 p-2.5">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(LIBELLE_STATUT_IDEE).map(([v, lib]) => (
          <label key={v} className="flex items-center gap-1 text-xs text-slate-700">
            <input type="radio" name="statut" value={v} defaultChecked={statut === v} className="accent-brand-accent" /> {lib}
          </label>
        ))}
      </div>
      <textarea
        name="reponse"
        rows={2}
        maxLength={REPONSE_MAX}
        defaultValue={reponse}
        placeholder={anonyme ? "Note pour vous (idée anonyme : personne à prévenir)" : "Votre réponse au prof (facultatif)"}
        className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enCours} className="rounded-md bg-brand-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60">
          {enCours ? "…" : "Enregistrer"}
        </button>
        {!anonyme && (
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input type="checkbox" name="prevenir" defaultChecked className="h-3.5 w-3.5 accent-brand-accent" /> Prévenir le prof par mail
          </label>
        )}
        {etat.message && <span className={`text-xs ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</span>}
      </div>
    </form>
  );
}
