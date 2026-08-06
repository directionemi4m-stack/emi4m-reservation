"use client";

import { useActionState, useState } from "react";
import {
  enregistrerPointage,
  type EtatAction,
} from "@/app/(app)/presences/[classeId]/[seanceId]/actions";

type Statut = "PRESENT" | "ABSENT" | "EXCUSE";

interface Eleve {
  id: string;
  nom: string;
}

const etatInitial: EtatAction = { succes: true };

export function PointageForm({
  classeId,
  seanceId,
  eleves,
  marquesExistantes,
}: {
  classeId: string;
  seanceId: string;
  eleves: Eleve[];
  marquesExistantes: Record<string, Statut>;
}) {
  const [etat, action, enCours] = useActionState(enregistrerPointage, etatInitial);
  const [marks, setMarks] = useState<Record<string, Statut>>(() => {
    const initial: Record<string, Statut> = {};
    eleves.forEach((e) => {
      initial[e.id] = marquesExistantes[e.id] ?? "PRESENT";
    });
    return initial;
  });

  function setStatut(eleveId: string, statut: Statut) {
    setMarks((m) => ({ ...m, [eleveId]: statut }));
  }

  const compte = { PRESENT: 0, ABSENT: 0, EXCUSE: 0 };
  Object.values(marks).forEach((s) => compte[s]++);

  return (
    <form action={action} className="flex flex-col gap-4 pb-24">
      <input type="hidden" name="classeId" value={classeId} />
      <input type="hidden" name="seanceId" value={seanceId} />
      {eleves.map((e) => (
        <input key={e.id} type="hidden" name={`statut-${e.id}`} value={marks[e.id]} />
      ))}

      <p className="text-xs text-slate-400">✓ présent · EX absence justifiée · ✕ injustifiée</p>

      <div className="flex flex-col gap-2">
        {eleves.map((e) => {
          const s = marks[e.id];
          return (
            <div
              key={e.id}
              className={`flex items-center justify-between rounded-lg p-3 shadow-sm ${
                s === "ABSENT"
                  ? "bg-status-occupee/10"
                  : s === "EXCUSE"
                    ? "bg-status-attente/10"
                    : "bg-white"
              }`}
            >
              <span className="text-sm font-medium text-slate-700">{e.nom}</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setStatut(e.id, "PRESENT")}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                    s === "PRESENT"
                      ? "bg-status-dispo text-white"
                      : "border border-slate-300 text-slate-500"
                  }`}
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => setStatut(e.id, "EXCUSE")}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                    s === "EXCUSE"
                      ? "bg-status-attente text-white"
                      : "border border-slate-300 text-slate-500"
                  }`}
                >
                  EX
                </button>
                <button
                  type="button"
                  onClick={() => setStatut(e.id, "ABSENT")}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                    s === "ABSENT"
                      ? "bg-status-occupee text-white"
                      : "border border-slate-300 text-slate-500"
                  }`}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
        {eleves.length === 0 && (
          <p className="text-sm text-slate-500">Aucun élève dans ce cours.</p>
        )}
      </div>

      {etat.message && <p className="text-sm text-status-occupee">{etat.message}</p>}

      {eleves.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white p-4 shadow-lg">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <div className="flex gap-4 text-sm text-slate-600">
              <span>
                <b className="text-status-dispo">{compte.PRESENT}</b> présents
              </span>
              <span>
                <b className="text-status-attente">{compte.EXCUSE}</b> excusés
              </span>
              <span>
                <b className="text-status-occupee">{compte.ABSENT}</b> absents
              </span>
            </div>
            <button
              type="submit"
              disabled={enCours}
              className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
            >
              {enCours ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
