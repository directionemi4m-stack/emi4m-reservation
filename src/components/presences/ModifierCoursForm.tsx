"use client";

import { useMemo, useState } from "react";
import { modifierCoursDetails, type EtatAction } from "@/app/(app)/presences/actions";
import { useSoumission } from "@/lib/useSoumission";

const etatInitial: EtatAction = { succes: true };

const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

interface Discipline {
  id: string;
  nom: string;
  type: "INSTRUMENT" | "FM";
}
interface Niveau {
  id: string;
  nom: string;
}
interface Lieu {
  id: string;
  nom: string;
}

export function ModifierCoursForm({
  classeId,
  jourActuel,
  disciplineActuelleId,
  niveauFMActuelId,
  lieuActuelId,
  disciplines,
  niveaux,
  lieux,
}: {
  classeId: string;
  jourActuel: string | null;
  disciplineActuelleId: string | null;
  niveauFMActuelId: string | null;
  lieuActuelId: string | null;
  disciplines: Discipline[];
  niveaux: Niveau[];
  lieux: Lieu[];
}) {
  const [ouvert, setOuvert] = useState(false);
  const [disciplineId, setDisciplineId] = useState(disciplineActuelleId ?? "");
  const [etat, soumettre, enCours] = useSoumission(modifierCoursDetails, etatInitial);

  const discipline = useMemo(
    () => disciplines.find((d) => d.id === disciplineId) ?? null,
    [disciplines, disciplineId]
  );
  const estFM = discipline?.type === "FM";

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="text-xs font-medium text-brand-accent hover:underline"
      >
        Modifier la discipline ou le jour
      </button>
    );
  }

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-3 rounded-md bg-slate-50 p-3">
      <input type="hidden" name="id" value={classeId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <select
          name="disciplineId"
          required
          value={disciplineId}
          onChange={(e) => setDisciplineId(e.target.value)}
          className={champClass}
        >
          <option value="" disabled>
            Choisir une discipline…
          </option>
          {disciplines.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nom}
            </option>
          ))}
        </select>

        {estFM && (
          <>
            <select
              name="niveauFMId"
              required
              defaultValue={niveauFMActuelId ?? ""}
              className={champClass}
            >
              <option value="" disabled>
                Choisir un niveau…
              </option>
              {niveaux.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nom}
                </option>
              ))}
            </select>
            <select name="lieuId" defaultValue={lieuActuelId ?? ""} className={champClass}>
              <option value="">—</option>
              {lieux.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nom}
                </option>
              ))}
            </select>
          </>
        )}

        <input
          name="jour"
          defaultValue={jourActuel ?? ""}
          placeholder="Jour / horaire (ex. Mardi 17h)"
          className={champClass}
        />
      </div>

      <p className="text-xs text-slate-400">
        Les élèves, séances et présences déjà enregistrées restent inchangés.
      </p>

      {etat.message && (
        <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>
          {etat.message}
        </p>
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
  );
}
