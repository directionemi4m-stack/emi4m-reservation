"use client";

import { useActionState } from "react";
import { supprimerActivite, type EtatAction } from "@/app/(app)/activite-accessoire/actions";
import { BoutonConfirmation } from "@/components/admin/BoutonConfirmation";

const ETAT_INITIAL: EtatAction = { succes: true };

export function SupprimerActiviteBouton({ id }: { id: string }) {
  const [, action, enCours] = useActionState(supprimerActivite, ETAT_INITIAL);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <BoutonConfirmation
        message="Supprimer cette activité ?"
        disabled={enCours}
        className="text-xs text-slate-400 hover:text-status-occupee"
      >
        ✕
      </BoutonConfirmation>
    </form>
  );
}
