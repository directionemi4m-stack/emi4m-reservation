"use client";

import { useActionState } from "react";
import {
  basculerActifSalle,
  supprimerSalle,
  type EtatAction,
} from "@/app/(app)/admin/parametres/salles/actions";
import { BoutonConfirmation } from "@/components/admin/BoutonConfirmation";

const etatInitial: EtatAction = { succes: true };

export function ActionsSalle({ salleId, actif }: { salleId: string; actif: boolean }) {
  const [etat, action, enCours] = useActionState(supprimerSalle, etatInitial);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        <form action={basculerActifSalle}>
          <input type="hidden" name="salleId" value={salleId} />
          <input type="hidden" name="actif" value={(!actif).toString()} />
          <button type="submit" className="text-xs font-medium text-brand-accent hover:underline">
            {actif ? "Désactiver" : "Activer"}
          </button>
        </form>
        <form action={action}>
          <input type="hidden" name="salleId" value={salleId} />
          <BoutonConfirmation
            message="Supprimer définitivement cette salle ? Cette action est irréversible."
            disabled={enCours}
            className="text-xs font-medium text-status-occupee hover:underline disabled:opacity-60"
          >
            Supprimer
          </BoutonConfirmation>
        </form>
      </div>
      {etat.message && <p className="max-w-56 text-right text-xs text-status-occupee">{etat.message}</p>}
    </div>
  );
}
