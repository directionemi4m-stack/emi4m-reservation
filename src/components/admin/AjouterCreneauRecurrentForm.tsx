"use client";

import { useActionState } from "react";
import {
  ajouterCreneauRecurrent,
  type EtatAction,
} from "@/app/(app)/admin/parametres/creneaux-recurrents/actions";
import {
  ChampsCreneauRecurrent,
  type ProfChoix,
  type SalleChoix,
} from "@/components/admin/ChampsCreneauRecurrent";

const etatInitial: EtatAction = { succes: true };

export function AjouterCreneauRecurrentForm({
  profs,
  salles,
}: {
  profs: ProfChoix[];
  salles: SalleChoix[];
}) {
  const [etat, action, enCours] = useActionState(ajouterCreneauRecurrent, etatInitial);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-brand-slate">Ajouter un créneau récurrent</h2>
      <ChampsCreneauRecurrent profs={profs} salles={salles} />
      {etat.message && (
        <p className={etat.succes ? "text-sm text-status-dispo" : "text-sm text-status-occupee"}>
          {etat.message}
        </p>
      )}
      <button
        type="submit"
        disabled={enCours}
        className="self-start rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
      >
        {enCours ? "Ajout…" : "Ajouter"}
      </button>
    </form>
  );
}
