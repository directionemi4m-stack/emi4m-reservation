"use client";

import { useActionState, useMemo, useState } from "react";
import { creerClasse, type EtatAction } from "@/app/(app)/presences/actions";

const EMOJIS = ["🎺", "🎻", "🎹", "🥁", "🎸", "🎷", "🪈", "🎤", "🪕", "🎼"];

const etatInitial: EtatAction = { succes: true };

const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

interface Lieu {
  id: string;
  nom: string;
}
interface Niveau {
  id: string;
  nom: string;
}
interface Discipline {
  id: string;
  nom: string;
  type: "INSTRUMENT" | "FM";
}

export function NouvelleClasseForm({
  lieux,
  niveaux,
  disciplines,
}: {
  lieux: Lieu[];
  niveaux: Niveau[];
  disciplines: Discipline[];
}) {
  const [etat, action, enCours] = useActionState(creerClasse, etatInitial);
  const [disciplineId, setDisciplineId] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const aujourdHui = new Date().toISOString().slice(0, 10);

  const discipline = useMemo(
    () => disciplines.find((d) => d.id === disciplineId) ?? null,
    [disciplines, disciplineId]
  );
  const estFM = discipline?.type === "FM";

  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg bg-white p-6 shadow-sm">
      <input type="hidden" name="emoji" value={estFM ? "🎼" : emoji} />

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Discipline
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
      </label>

      {discipline && !estFM && (
        <div className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Icône
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`rounded-md border px-2.5 py-1.5 text-lg ${
                  emoji === e ? "border-brand-accent bg-brand-accent/10" : "border-slate-300"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {estFM && (
        <>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Niveau
            <select name="niveauFMId" required defaultValue="" className={champClass}>
              <option value="" disabled>
                Choisir un niveau…
              </option>
              {niveaux.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nom}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
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
        </>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Jour / horaire (facultatif)
        <input type="text" name="jour" placeholder="Ex. Mardi 17h" className={champClass} />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Date du 1er cours
        <input type="date" name="dateDebut" required defaultValue={aujourdHui} className={champClass} />
      </label>
      <p className="text-xs text-slate-400">
        30 séances générées automatiquement, vacances scolaires (zone A) exclues.
      </p>

      {etat.message && <p className="text-sm text-status-occupee">{etat.message}</p>}

      <button
        type="submit"
        disabled={enCours}
        className="self-start rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
      >
        {enCours ? "Création…" : "Créer le cours"}
      </button>
    </form>
  );
}
