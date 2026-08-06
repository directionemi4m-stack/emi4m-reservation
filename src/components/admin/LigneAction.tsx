"use client";

import { useActionState, useState } from "react";
import {
  validerCreneau,
  refuserCreneau,
  supprimerLigneDemande,
  type EtatAction,
} from "@/app/(app)/admin/demandes/actions";
import { BoutonConfirmation } from "@/components/admin/BoutonConfirmation";

const etatInitial: EtatAction = { succes: true };

export function LigneAction({ id }: { id: string }) {
  const [etatValider, actionValider, enCoursValider] = useActionState(validerCreneau, etatInitial);
  const [etatRefuser, actionRefuser, enCoursRefuser] = useActionState(refuserCreneau, etatInitial);
  const [etatSupprimer, actionSupprimer, enCoursSupprimer] = useActionState(
    supprimerLigneDemande,
    etatInitial
  );
  const [afficherMotif, setAfficherMotif] = useState(false);

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <form action={actionValider}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            disabled={enCoursValider}
            className="rounded-md bg-status-dispo px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {enCoursValider ? "…" : "Valider"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setAfficherMotif((v) => !v)}
          className="rounded-md border border-status-occupee px-3 py-1.5 text-xs font-semibold text-status-occupee hover:bg-status-occupee/10"
        >
          Refuser
        </button>
        <form action={actionSupprimer}>
          <input type="hidden" name="id" value={id} />
          <BoutonConfirmation
            message="Supprimer définitivement cette ligne ? Le prof ne sera pas prévenu."
            disabled={enCoursSupprimer}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-60"
          >
            Supprimer
          </BoutonConfirmation>
        </form>
      </div>

      {afficherMotif && (
        <form action={actionRefuser} className="flex w-56 flex-col items-end gap-2">
          <input type="hidden" name="id" value={id} />
          <textarea
            name="motif"
            placeholder="Motif (optionnel)"
            rows={2}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
          />
          <button
            type="submit"
            disabled={enCoursRefuser}
            className="rounded-md bg-status-occupee px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {enCoursRefuser ? "…" : "Confirmer le refus"}
          </button>
        </form>
      )}

      {etatValider.message && <p className="max-w-56 text-right text-xs text-status-occupee">{etatValider.message}</p>}
      {etatRefuser.message && <p className="max-w-56 text-right text-xs text-status-occupee">{etatRefuser.message}</p>}
      {etatSupprimer.message && <p className="max-w-56 text-right text-xs text-status-occupee">{etatSupprimer.message}</p>}
    </div>
  );
}
