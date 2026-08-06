"use client";

import { supprimerEleve } from "@/app/(app)/presences/[classeId]/actions";
import { BoutonConfirmation } from "@/components/admin/BoutonConfirmation";

export function SupprimerEleveBouton({ classeId, eleveId }: { classeId: string; eleveId: string }) {
  return (
    <form action={supprimerEleve}>
      <input type="hidden" name="classeId" value={classeId} />
      <input type="hidden" name="eleveId" value={eleveId} />
      <BoutonConfirmation
        message="Retirer cet élève du cours ?"
        className="text-xs text-slate-400 hover:text-status-occupee"
      >
        ✕
      </BoutonConfirmation>
    </form>
  );
}
