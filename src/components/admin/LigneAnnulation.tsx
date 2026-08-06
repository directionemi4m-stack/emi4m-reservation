"use client";

import { useActionState, useState } from "react";
import {
  annulerReservationValidee,
  supprimerLigneDemande,
  type EtatAction,
} from "@/app/(app)/admin/demandes/actions";
import { BoutonConfirmation } from "@/components/admin/BoutonConfirmation";

const etatInitial: EtatAction = { succes: true };

export function LigneAnnulation({ id }: { id: string }) {
  const [etat, action, enCours] = useActionState(annulerReservationValidee, etatInitial);
  const [etatSupprimer, actionSupprimer, enCoursSupprimer] = useActionState(
    supprimerLigneDemande,
    etatInitial
  );
  const [afficherMotif, setAfficherMotif] = useState(false);

  return (
    <div className="flex flex-col items-end gap-2">
      {!afficherMotif && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAfficherMotif(true)}
            className="rounded-md border border-slate-400 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
          >
            Annuler cette réservation
          </button>
          <form action={actionSupprimer}>
            <input type="hidden" name="id" value={id} />
            <BoutonConfirmation
              message="Supprimer définitivement cette réservation ? Le prof ne sera pas prévenu."
              disabled={enCoursSupprimer}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-slate-100 disabled:opacity-60"
            >
              Supprimer
            </BoutonConfirmation>
          </form>
        </div>
      )}

      {afficherMotif && (
        <form action={action} className="flex w-56 flex-col items-end gap-2">
          <input type="hidden" name="id" value={id} />
          <textarea
            name="motif"
            placeholder="Motif (optionnel)"
            rows={2}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAfficherMotif(false)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
            >
              Retour
            </button>
            <button
              type="submit"
              disabled={enCours}
              className="rounded-md bg-slate-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {enCours ? "…" : "Confirmer l'annulation"}
            </button>
          </div>
        </form>
      )}

      {etat.message && <p className="max-w-56 text-right text-xs text-status-occupee">{etat.message}</p>}
      {etatSupprimer.message && (
        <p className="max-w-56 text-right text-xs text-status-occupee">{etatSupprimer.message}</p>
      )}
    </div>
  );
}
