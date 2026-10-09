"use client";

import { useActionState, useState } from "react";
import { ajouterCreneau, type EtatAction } from "@/app/(app)/agenda/actions";
import { DUREES_COLLECTIF, DUREES_INDIVIDUEL } from "@/lib/agenda";
import { JOURS_SEMAINE_OPTIONS } from "@/lib/joursSemaine";

const ETAT_INITIAL: EtatAction = { succes: true };

const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

function libelleDuree(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m}` : `${h} h`;
}

export function AjouterCreneauForm({
  lieux,
  suggestions,
  profIdCible,
}: {
  lieux: { id: string; nom: string }[];
  suggestions: string[];
  profIdCible?: string;
}) {
  const [etat, action, enCours] = useActionState(ajouterCreneau, ETAT_INITIAL);
  const [type, setType] = useState<"INDIVIDUEL" | "COLLECTIF">("INDIVIDUEL");
  const durees: readonly number[] = type === "INDIVIDUEL" ? DUREES_INDIVIDUEL : DUREES_COLLECTIF;

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-brand-slate">Ajouter un cours</h2>
      {profIdCible && <input type="hidden" name="profId" value={profIdCible} />}
      <input type="hidden" name="type" value={type} />

      <div className="flex gap-2">
        {(["INDIVIDUEL", "COLLECTIF"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
              type === t ? "border-brand-accent bg-brand-accent/10 text-brand-accent" : "border-slate-300 text-slate-600"
            }`}
          >
            {t === "INDIVIDUEL" ? "Cours individuel" : "Cours collectif"}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Jour
          <select name="jourSemaine" required defaultValue="" className={champClass}>
            <option value="" disabled>
              Choisir…
            </option>
            {JOURS_SEMAINE_OPTIONS.map((j) => (
              <option key={j.valeur} value={j.valeur}>
                {j.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Début
          <input type="time" name="heureDebut" required step={300} className={champClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Durée
          <select key={type} name="dureeMinutes" required defaultValue={durees[0]} className={champClass}>
            {durees.map((d) => (
              <option key={d} value={d}>
                {libelleDuree(d)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
          {type === "INDIVIDUEL" ? "Élève" : "Groupe"}
          <input
            name="nom"
            required
            list="suggestions-eleves"
            autoComplete="off"
            placeholder={type === "INDIVIDUEL" ? "Prénom Nom" : "Ex. FM2, Ensemble de guitare"}
            className={champClass}
          />
          <datalist id="suggestions-eleves">
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Lieu
          <select name="lieuId" defaultValue="" className={champClass}>
            <option value="">—</option>
            {lieux.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nom}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="uneSemaineSurDeux" className="h-4 w-4 accent-brand-accent" />
          Une semaine sur deux
          <span className="text-xs text-slate-400">(compte pour moitié dans le volume horaire)</span>
        </label>
        <button
          type="submit"
          disabled={enCours}
          className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
        >
          {enCours ? "Ajout…" : "Ajouter"}
        </button>
      </div>
      {etat.message && <p className="text-sm text-status-occupee">{etat.message}</p>}
    </form>
  );
}
