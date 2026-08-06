"use client";

import { useActionState } from "react";
import { supprimerLigneDemande, type EtatAction } from "@/app/(app)/admin/demandes/actions";
import { BoutonConfirmation } from "@/components/admin/BoutonConfirmation";

const etatInitial: EtatAction = { succes: true };

export function SupprimerLigneAdmin({ id }: { id: string }) {
  const [etat, action, enCours] = useActionState(supprimerLigneDemande, etatInitial);

  return (
    <form action={action} className="flex items-center">
      <input type="hidden" name="id" value={id} />
      <BoutonConfirmation
        message="Supprimer définitivement cette ligne ?"
        disabled={enCours}
        className="text-xs font-medium text-status-occupee hover:underline disabled:opacity-60"
      >
        Supprimer
      </BoutonConfirmation>
      {etat.message && <p className="ml-2 text-xs text-status-occupee">{etat.message}</p>}
    </form>
  );
}
