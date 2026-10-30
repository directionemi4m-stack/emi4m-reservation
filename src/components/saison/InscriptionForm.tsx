"use client";

import { useActionState } from "react";
import { ajouterInscription, type EtatAction } from "@/app/(app)/saison/actions";

const ETAT_INITIAL: EtatAction = { succes: true };

const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

export function InscriptionForm({
  evenementId,
  eleves,
  instruments,
}: {
  evenementId: string;
  eleves: string[];
  instruments: string[];
}) {
  const [etat, action, enCours] = useActionState(ajouterInscription, ETAT_INITIAL);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-brand-slate">Inscrire un élève</h2>
      <input type="hidden" name="evenementId" value={evenementId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Élève
          <input name="eleveNom" required list="hm-eleves" autoComplete="off" placeholder="Prénom Nom" className={champClass} />
          <datalist id="hm-eleves">
            {eleves.map((e) => (
              <option key={e} value={e} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Instrument
          <input name="instrument" required list="hm-instruments" autoComplete="off" className={champClass} />
          <datalist id="hm-instruments">
            {instruments.map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Minutage
          <input name="minutage" required placeholder="Ex. 3'30" className={champClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-3">
          Programme joué
          <input name="programme" required placeholder="Ex. Menuet en sol — J.S. Bach" className={champClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Matériel nécessaire (facultatif)
          <input name="materiel" placeholder="Ex. pupitre, ampli, piano" className={champClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
          Commentaire (facultatif)
          <input name="commentaire" className={champClass} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={enCours}
          className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
        >
          {enCours ? "Inscription…" : "Inscrire"}
        </button>
        {etat.message && <p className="text-sm text-status-occupee">{etat.message}</p>}
      </div>
    </form>
  );
}
