"use client";

import { useActionState, useRef, useEffect } from "react";
import { ajouterEleve, type EtatAction } from "@/app/(app)/presences/[classeId]/actions";

const etatInitial: EtatAction = { succes: true };

export function AjouterEleveForm({
  classeId,
  suggestions = [],
}: {
  classeId: string;
  suggestions?: { valeur: string; detail: string }[]; // élèves de l'annuaire
}) {
  const [etat, action, enCours] = useActionState(ajouterEleve, etatInitial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (etat.succes) ref.current?.reset();
  }, [etat]);

  return (
    <form ref={ref} action={action} className="flex gap-2">
      <input type="hidden" name="classeId" value={classeId} />
      <input
        type="text"
        name="nom"
        placeholder={suggestions.length > 0 ? "Nom de l'élève (tapez pour chercher dans l'annuaire)" : "Nom de l'élève"}
        list={suggestions.length > 0 ? `annuaire-${classeId}` : undefined}
        autoComplete="off"
        required
        className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
      />
      {suggestions.length > 0 && (
        <datalist id={`annuaire-${classeId}`}>
          {suggestions.map((e) => (
            <option key={e.valeur} value={e.valeur} label={e.detail} />
          ))}
        </datalist>
      )}
      <button
        type="submit"
        disabled={enCours}
        className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60"
      >
        ＋
      </button>
      {etat.message && <p className="text-xs text-status-occupee">{etat.message}</p>}
    </form>
  );
}
