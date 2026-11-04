"use client";

import { useActionState, useState } from "react";
import { TelephonesEleve } from "@/components/presences/TelephonesEleve";
import {
  enregistrerPointage,
  type EtatAction,
} from "@/app/(app)/presences/[classeId]/[seanceId]/actions";

type Statut = "PRESENT" | "ABSENT" | "EXCUSE";

export interface ElevePointage {
  id: string;
  nom: string;
  telephones?: string[]; // de l'annuaire des élèves : appeler la famille d'un absent
  nomAnnuaire?: string | null; // rappelé quand l'élève est écrit autrement dans l'annuaire
  dansAnnuaire?: boolean;
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
  eleves: ElevePointage[];
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
    <form action={action} className="flex flex-col gap-4 pb-28 md:pb-24">
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
              <span className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm font-medium text-slate-700">
                {e.nom}
                {s === "ABSENT" &&
                  (e.telephones?.length ? (
                    <TelephonesEleve telephones={e.telephones} nomAnnuaire={e.nomAnnuaire} />
                  ) : (
                    <span className="text-xs font-normal text-slate-400">
                      {e.dansAnnuaire ? "pas de numéro dans l'annuaire" : "pas trouvé dans l'annuaire"}
                    </span>
                  ))}
              </span>
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
        // Sur téléphone, la barre d'enregistrement se pose au-dessus de la barre de navigation
        // du bas (sinon celle-ci la recouvre et le bouton « Enregistrer » disparaît).
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white p-4 shadow-lg md:bottom-0">
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
