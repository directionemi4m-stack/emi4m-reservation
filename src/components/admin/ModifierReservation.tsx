"use client";

import { useState } from "react";
import { useSoumission } from "@/lib/useSoumission";
import {
  modifierReservationValidee,
  type EtatAction,
} from "@/app/(app)/admin/demandes/actions";
import type { SalleChoix } from "@/components/admin/ChampsCreneauRecurrent";

const etatInitial: EtatAction = { succes: true };

const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

export function ModifierReservation({
  id,
  valeurs,
  salles,
  profPrenom,
  ouvertParDefaut,
}: {
  id: string;
  valeurs: { salleId: string; date: string; heureDebut: string; heureFin: string };
  salles: SalleChoix[];
  profPrenom: string;
  ouvertParDefaut: boolean;
}) {
  const [ouvert, setOuvert] = useState(ouvertParDefaut);
  const [etat, soumettre, enCours] = useSoumission(modifierReservationValidee, etatInitial);

  const groupes = new Map<string, SalleChoix[]>();
  for (const s of salles) {
    const liste = groupes.get(s.commune.nom) ?? [];
    liste.push(s);
    groupes.set(s.commune.nom, liste);
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="text-xs font-medium text-brand-accent hover:underline"
      >
        Modifier cette réservation (salle, date, horaires)
      </button>
    );
  }

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-3 rounded-md bg-slate-50 p-3">
      <input type="hidden" name="id" value={id} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-slate-500 sm:col-span-2">
          Salle
          <select name="salleId" required defaultValue={valeurs.salleId} className={champClass}>
            {Array.from(groupes.entries()).map(([commune, sallesCommune]) => (
              <optgroup key={commune} label={commune}>
                {sallesCommune.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 sm:col-span-2">
          Date
          <input type="date" name="date" required defaultValue={valeurs.date} className={champClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Début
          <input type="time" name="heureDebut" required defaultValue={valeurs.heureDebut} className={champClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Fin
          <input type="time" name="heureFin" required defaultValue={valeurs.heureFin} className={champClass} />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="prevenir" defaultChecked />
        Prévenir {profPrenom} par mail
      </label>

      {etat.message && !etat.succes && <p className="text-sm text-status-occupee">{etat.message}</p>}

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
  );
}
