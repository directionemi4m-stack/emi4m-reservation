"use client";

import { useActionState } from "react";

type EtatAction = { succes: boolean; message?: string };

export function AjouterItemForm({
  titre,
  placeholder,
  action,
}: {
  titre: string;
  placeholder: string;
  action: (etat: EtatAction, formData: FormData) => Promise<EtatAction>;
}) {
  const [etat, dispatch, enCours] = useActionState(action, { succes: true });

  return (
    <form action={dispatch} className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-brand-slate">{titre}</h2>
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          name="nom"
          placeholder={placeholder}
          required
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
        />
        <button
          type="submit"
          disabled={enCours}
          className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
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
