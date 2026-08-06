"use client";

import { useActionState } from "react";
import { supprimerClasse, type EtatAction } from "@/app/(app)/presences/actions";
import { BoutonConfirmation } from "@/components/admin/BoutonConfirmation";

const etatInitial: EtatAction = { succes: true };

export function SupprimerClasseBouton({ id }: { id: string }) {
  const [etat, action, enCours] = useActionState(supprimerClasse, etatInitial);

  return (
    <form action={action} onClick={(e) => e.stopPropagation()}>
      <input type="hidden" name="id" value={id} />
      <BoutonConfirmation
        message="Supprimer ce cours, ses élèves et ses séances ? Cette action est irréversible."
        disabled={enCours}
        className="rounded-md p-1.5 text-slate-400 hover:bg-status-occupee/10 hover:text-status-occupee disabled:opacity-60"
      >
        🗑
      </BoutonConfirmation>
      {etat.message && <p className="mt-1 max-w-40 text-right text-xs text-status-occupee">{etat.message}</p>}
    </form>
  );
}
