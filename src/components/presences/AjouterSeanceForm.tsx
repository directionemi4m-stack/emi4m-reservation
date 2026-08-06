"use client";

import { useActionState, useState } from "react";
import { ajouterSeance, type EtatAction } from "@/app/(app)/presences/[classeId]/actions";

const etatInitial: EtatAction = { succes: true };

export function AjouterSeanceForm({ classeId, dateSuggeree }: { classeId: string; dateSuggeree: string }) {
  const [etat, action, enCours] = useActionState(ajouterSeance, etatInitial);
  const [afficher, setAfficher] = useState(false);

  if (!afficher) {
    return (
      <button
        type="button"
        onClick={() => setAfficher(true)}
        className="self-start text-sm font-medium text-brand-accent hover:underline"
      >
        + Ajouter une séance
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="classeId" value={classeId} />
      <input
        type="date"
        name="date"
        required
        defaultValue={dateSuggeree}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
      />
      <button
        type="submit"
        disabled={enCours}
        className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60"
      >
        {enCours ? "…" : "Ajouter"}
      </button>
      <button
        type="button"
        onClick={() => setAfficher(false)}
        className="text-sm text-slate-500 hover:underline"
      >
        Annuler
      </button>
      {etat.message && <p className="w-full text-xs text-status-occupee">{etat.message}</p>}
    </form>
  );
}
