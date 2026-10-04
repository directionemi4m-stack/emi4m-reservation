"use client";

import { useActionState } from "react";
import { modifierCoordonnees, type EtatAction } from "@/app/(app)/annuaire/actions";

const ETAT_INITIAL: EtatAction = { succes: true };

const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

export function CoordonneesForm({
  telephonePartage,
  emailPartage,
}: {
  telephonePartage: string | null;
  emailPartage: string | null;
}) {
  const [etat, action, enCours] = useActionState(modifierCoordonnees, ETAT_INITIAL);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Téléphone
          <input
            type="tel"
            name="telephonePartage"
            defaultValue={telephonePartage ?? ""}
            placeholder="Ex. 06 12 34 56 78"
            className={champClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Email
          <input
            type="email"
            name="emailPartage"
            defaultValue={emailPartage ?? ""}
            placeholder="Ex. prenom.nom@exemple.fr"
            className={champClass}
          />
        </label>
      </div>
      <div>
        <button
          type="submit"
          disabled={enCours}
          className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
        >
          {enCours ? "Enregistrement…" : "Enregistrer"}
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
