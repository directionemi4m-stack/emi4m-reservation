"use client";

import { useActionState } from "react";
import { BoutonConfirmation } from "@/components/admin/BoutonConfirmation";

type EtatAction = { succes: boolean; message?: string };

export function ActionsItemPresence({
  id,
  actif,
  basculerAction,
  supprimerAction,
}: {
  id: string;
  actif: boolean;
  basculerAction: (formData: FormData) => Promise<void>;
  supprimerAction: (etat: EtatAction, formData: FormData) => Promise<EtatAction>;
}) {
  const [etat, dispatch, enCours] = useActionState(supprimerAction, { succes: true });

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        <form action={basculerAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="actif" value={(!actif).toString()} />
          <button type="submit" className="text-xs font-medium text-brand-accent hover:underline">
            {actif ? "Désactiver" : "Activer"}
          </button>
        </form>
        <form action={dispatch}>
          <input type="hidden" name="id" value={id} />
          <BoutonConfirmation
            message="Supprimer définitivement ? Cette action est irréversible."
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
