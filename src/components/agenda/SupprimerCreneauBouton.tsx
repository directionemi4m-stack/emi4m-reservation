"use client";

import { useActionState } from "react";
import { supprimerCreneau, type EtatAction } from "@/app/(app)/agenda/actions";
import { BoutonConfirmation } from "@/components/admin/BoutonConfirmation";

const ETAT_INITIAL: EtatAction = { succes: true };

export function SupprimerCreneauBouton({ id }: { id: string }) {
  const [, action, enCours] = useActionState(supprimerCreneau, ETAT_INITIAL);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <BoutonConfirmation
        message="Supprimer ce cours de l'emploi du temps ?"
        disabled={enCours}
        className="text-xs text-slate-400 hover:text-status-occupee"
      >
        ✕
      </BoutonConfirmation>
    </form>
  );
}
