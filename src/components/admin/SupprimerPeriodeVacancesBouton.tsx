"use client";

import { useActionState } from "react";
import { supprimerPeriodeVacances, type EtatAction } from "@/app/(app)/admin/parametres/vacances/actions";
import { BoutonConfirmation } from "@/components/admin/BoutonConfirmation";

const ETAT_INITIAL: EtatAction = { succes: true };

export function SupprimerPeriodeVacancesBouton({ id }: { id: string }) {
  const [, action, enCours] = useActionState(supprimerPeriodeVacances, ETAT_INITIAL);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <BoutonConfirmation
        message="Supprimer cette période ?"
        disabled={enCours}
        className="text-xs font-medium text-status-occupee hover:underline disabled:opacity-60"
      >
        Supprimer
      </BoutonConfirmation>
    </form>
  );
}
