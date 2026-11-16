"use client";

import { useActionState } from "react";
import type { EtatAction } from "@/app/(app)/admin/contrats/actions";

// Petit bouton d'action (envoyer à la présidence, relancer le prof, ranger dans le Drive)
// avec son message de retour.
export function ActionContrat({
  action,
  id,
  libelle,
  principal = false,
}: {
  action: (etat: EtatAction, fd: FormData) => Promise<EtatAction>;
  id?: string;
  libelle: string;
  principal?: boolean;
}) {
  const [etat, envoyer, enCours] = useActionState(action, { succes: true } as EtatAction);
  return (
    <form action={envoyer} className="flex flex-wrap items-center gap-2">
      {id && <input type="hidden" name="id" value={id} />}
      <button
        type="submit"
        disabled={enCours}
        className={
          principal
            ? "rounded-md bg-brand-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60"
            : "rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        }
      >
        {enCours ? "…" : libelle}
      </button>
      {etat.message && <span className={`text-xs ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</span>}
    </form>
  );
}
