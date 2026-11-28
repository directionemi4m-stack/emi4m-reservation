"use client";

import { useSoumission } from "@/lib/useSoumission";
import { enregistrerReglement, type EtatAction } from "@/app/(app)/reglement-interieur/actions";

const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";
const etatInitial: EtatAction = { succes: true };

// Direction : déposer ou remplacer le PDF, et indiquer la date de la dernière mise à jour.
export function DepotReglement({ majLe, existe, aujourdHui }: { majLe: string | null; existe: boolean; aujourdHui: string }) {
  const [etat, soumettre, enCours] = useSoumission(enregistrerReglement, etatInitial);
  return (
    <form onSubmit={soumettre} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          {existe ? "Remplacer le PDF (facultatif)" : "PDF du règlement intérieur"}
          <input type="file" name="pdf" accept="application/pdf" required={!existe} className="text-sm text-slate-700 file:mr-2 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-2.5 file:py-1.5 file:text-xs" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Date de la dernière mise à jour
          <input type="date" name="majLe" required defaultValue={majLe ?? aujourdHui} max={aujourdHui} className={champClass} />
        </label>
      </div>
      {etat.message && <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>}
      <button type="submit" disabled={enCours} className="w-fit rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60">
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
