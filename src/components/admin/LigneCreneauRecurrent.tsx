"use client";

import { useActionState, useState } from "react";
import {
  desactiverCreneauRecurrent,
  modifierCreneauRecurrent,
  type EtatAction,
} from "@/app/(app)/admin/parametres/creneaux-recurrents/actions";
import {
  ChampsCreneauRecurrent,
  type ProfChoix,
  type SalleChoix,
  type ValeursCreneauRecurrent,
} from "@/components/admin/ChampsCreneauRecurrent";

const etatInitial: EtatAction = { succes: true };

// Une ligne de l'emploi du temps de base : affichage + modification en place.
export function LigneCreneauRecurrent({
  id,
  jour,
  horaire,
  salleLabel,
  periode,
  valeurs,
  profs,
  salles,
  ouvertParDefaut,
}: {
  id: string;
  jour: string;
  horaire: string;
  salleLabel: string;
  periode: string;
  valeurs: ValeursCreneauRecurrent;
  profs: ProfChoix[];
  salles: SalleChoix[];
  ouvertParDefaut: boolean;
}) {
  const [ouvert, setOuvert] = useState(ouvertParDefaut);
  const [etat, action, enCours] = useActionState(modifierCreneauRecurrent, etatInitial);

  return (
    <>
      <tr id={`creneau-${id}`} className="scroll-mt-20 border-t border-slate-100">
        <td className="py-2 text-slate-700">{jour}</td>
        <td className="py-2 text-slate-700">{horaire}</td>
        <td className="py-2 text-slate-600">{salleLabel}</td>
        <td className="py-2 text-xs text-slate-400">{periode}</td>
        <td className="py-2 text-right">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOuvert((v) => !v)}
              className="text-xs font-medium text-brand-accent hover:underline"
            >
              {ouvert ? "Fermer" : "Modifier"}
            </button>
            <form action={desactiverCreneauRecurrent}>
              <input type="hidden" name="id" value={id} />
              <button type="submit" className="text-xs font-medium text-status-occupee hover:underline">
                Désactiver
              </button>
            </form>
          </div>
        </td>
      </tr>
      {ouvert && (
        <tr className="bg-slate-50">
          <td colSpan={5} className="p-3">
            <form action={action} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={id} />
              <ChampsCreneauRecurrent profs={profs} salles={salles} valeurs={valeurs} />
              {etat.message && !etat.succes && (
                <p className="text-sm text-status-occupee">{etat.message}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={enCours}
                  className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
                >
                  {enCours ? "Enregistrement…" : "Enregistrer"}
                </button>
                <button
                  type="button"
                  onClick={() => setOuvert(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-500 hover:bg-white"
                >
                  Annuler
                </button>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
