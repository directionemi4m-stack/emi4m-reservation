"use client";

import { useActionState } from "react";
import { supprimerTrajet, type EtatAction } from "@/app/(app)/frais/actions";
import { BoutonConfirmation } from "@/components/admin/BoutonConfirmation";

const ETAT_INITIAL: EtatAction = { succes: true };

export function SupprimerTrajetBouton({ id }: { id: string }) {
  const [, action, enCours] = useActionState(supprimerTrajet, ETAT_INITIAL);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <BoutonConfirmation
        message="Supprimer ce trajet ?"
        disabled={enCours}
        className="text-xs text-slate-400 hover:text-status-occupee"
      >
        ✕
      </BoutonConfirmation>
    </form>
  );
}
