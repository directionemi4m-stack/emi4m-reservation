"use client";

import { useActionState } from "react";
import { supprimerEvenement, type EtatAction } from "@/app/(app)/saison/actions";
import { BoutonConfirmation } from "@/components/admin/BoutonConfirmation";

const ETAT_INITIAL: EtatAction = { succes: true };

export function SupprimerEvenementBouton({ id, nbInscrits }: { id: string; nbInscrits: number }) {
  const [, action, enCours] = useActionState(supprimerEvenement, ETAT_INITIAL);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <BoutonConfirmation
        message={
          nbInscrits > 0
            ? `Supprimer cet événement et les ${nbInscrits} inscription(s) d'élèves associées ?`
            : "Supprimer cet événement ?"
        }
        disabled={enCours}
        className="text-xs font-medium text-status-occupee hover:underline"
      >
        Supprimer
      </BoutonConfirmation>
    </form>
  );
}
