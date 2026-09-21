"use client";

import { useActionState } from "react";
import {
  basculerActifProf,
  renvoyerLienProf,
  supprimerProf,
  type EtatAjoutProf,
} from "@/app/(app)/admin/parametres/profs/actions";
import { BoutonConfirmation } from "@/components/admin/BoutonConfirmation";

const etatInitial: EtatAjoutProf = { statut: "idle" };

export function ActionsProf({
  profId,
  actif,
  aMotDePasse,
}: {
  profId: string;
  actif: boolean;
  aMotDePasse: boolean;
}) {
  const [etat, action, enCours] = useActionState(supprimerProf, etatInitial);
  const [etatLien, actionLien, enCoursLien] = useActionState(renvoyerLienProf, etatInitial);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        {actif && (
          <form action={actionLien}>
            <input type="hidden" name="profId" value={profId} />
            <button
              type="submit"
              disabled={enCoursLien}
              className="text-xs font-medium text-brand-accent hover:underline disabled:opacity-60"
            >
              {enCoursLien ? "Envoi…" : aMotDePasse ? "Envoyer un lien de connexion" : "Renvoyer l'invitation"}
            </button>
          </form>
        )}
        <form action={basculerActifProf}>
          <input type="hidden" name="profId" value={profId} />
          <input type="hidden" name="actif" value={(!actif).toString()} />
          <button type="submit" className="text-xs font-medium text-brand-accent hover:underline">
            {actif ? "Désactiver" : "Activer"}
          </button>
        </form>
        <form action={action}>
          <input type="hidden" name="profId" value={profId} />
          <BoutonConfirmation
            message="Supprimer définitivement ce compte ? Cette action est irréversible."
            disabled={enCours}
            className="text-xs font-medium text-status-occupee hover:underline disabled:opacity-60"
          >
            Supprimer
          </BoutonConfirmation>
        </form>
      </div>
      {etat.message && <p className="max-w-56 text-right text-xs text-status-occupee">{etat.message}</p>}
      {etatLien.message && (
        <p
          className={`max-w-56 text-right text-xs ${
            etatLien.statut === "succes" ? "text-status-dispo" : "text-status-occupee"
          }`}
        >
          {etatLien.message}
        </p>
      )}
    </div>
  );
}
