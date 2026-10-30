"use client";

import { useActionState } from "react";
import { supprimerInscription, type EtatAction } from "@/app/(app)/saison/actions";
import { BoutonConfirmation } from "@/components/admin/BoutonConfirmation";

const ETAT_INITIAL: EtatAction = { succes: true };

export function SupprimerInscriptionBouton({ id }: { id: string }) {
  const [, action, enCours] = useActionState(supprimerInscription, ETAT_INITIAL);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <BoutonConfirmation
        message="Retirer cet élève de l'heure musicale ?"
        disabled={enCours}
        className="text-xs text-slate-400 hover:text-status-occupee"
      >
        ✕
      </BoutonConfirmation>
    </form>
  );
}
