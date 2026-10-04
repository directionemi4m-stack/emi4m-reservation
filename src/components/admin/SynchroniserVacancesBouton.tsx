"use client";

import { useActionState } from "react";
import { synchroniserVacancesMaintenant, type EtatAction } from "@/app/(app)/admin/parametres/vacances/actions";

const ETAT_INITIAL: EtatAction = { succes: true };

export function SynchroniserVacancesBouton() {
  const [etat, action, enCours] = useActionState(synchroniserVacancesMaintenant, ETAT_INITIAL);

  return (
    <form action={action} className="flex flex-col items-start gap-1">
      <button
        type="submit"
        disabled={enCours}
        className="rounded-md border border-brand-accent px-3 py-1.5 text-xs font-semibold text-brand-accent transition hover:bg-brand-accent/10 disabled:opacity-60"
      >
        {enCours ? "Synchronisation…" : "Synchroniser maintenant"}
      </button>
      {etat.message && (
        <p className={`text-xs ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>
      )}
    </form>
  );
}
