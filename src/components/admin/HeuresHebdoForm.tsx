"use client";

import { useActionState } from "react";
import { enregistrerHeuresHebdo, type EtatAction } from "@/app/(app)/admin/parametres/forfaits/actions";

const ETAT_INITIAL: EtatAction = { succes: true };

export function HeuresHebdoForm({
  userId,
  anneeScolaire,
  valeurInitiale,
}: {
  userId: string;
  anneeScolaire: string;
  valeurInitiale: string;
}) {
  const [etat, action, enCours] = useActionState(enregistrerHeuresHebdo, ETAT_INITIAL);

  return (
    <form action={action} className="flex flex-col gap-0.5">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="anneeScolaire" value={anneeScolaire} />
      <div className="flex items-center gap-1">
        <input
          name="heures"
          defaultValue={valeurInitiale}
          placeholder="ex. 5h30"
          className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-brand-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={enCours}
          className="rounded-md bg-brand-accent px-2 py-1 text-xs font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60"
        >
          {enCours ? "…" : "OK"}
        </button>
      </div>
      {etat.message && (
        <span className={`text-xs ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</span>
      )}
    </form>
  );
}
