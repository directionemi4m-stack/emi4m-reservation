"use client";

import { useActionState } from "react";
import { ajouterPeriodeVacances, type EtatAction } from "@/app/(app)/admin/parametres/vacances/actions";

const ETAT_INITIAL: EtatAction = { succes: true };

const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

export function AjouterPeriodeVacancesForm() {
  const [etat, dispatch, enCours] = useActionState(ajouterPeriodeVacances, ETAT_INITIAL);

  return (
    <form action={dispatch} className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-brand-slate">Ajouter une période de vacances</h2>
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          name="nom"
          placeholder="Ex. Toussaint"
          required
          className={`flex-1 ${champClass}`}
        />
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Début
          <input type="date" name="debut" required className={champClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Reprise (exclue)
          <input type="date" name="fin" required className={champClass} />
        </label>
        <button
          type="submit"
          disabled={enCours}
          className="self-end rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
        >
          {enCours ? "Ajout…" : "Ajouter"}
        </button>
      </div>
      {etat.message && (
        <p className={etat.succes ? "text-sm text-status-dispo" : "text-sm text-status-occupee"}>
          {etat.message}
        </p>
      )}
    </form>
  );
}
