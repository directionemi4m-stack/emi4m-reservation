"use client";

import { useActionState, useState } from "react";
import {
  signalerAbsenceProf,
  retirerAbsenceProf,
  type EtatAbsence,
} from "@/app/(app)/presences/[classeId]/[seanceId]/actions";

type Type = "RATTRAPAGE" | "ARRET_MALADIE";

interface AbsenceExistante {
  type: Type;
  dateRattrapage: string | null;
  commentaire: string | null;
}

const etatInitial: EtatAbsence = { succes: true };

export function AbsenceProfForm({
  classeId,
  seanceId,
  absenceExistante,
}: {
  classeId: string;
  seanceId: string;
  absenceExistante: AbsenceExistante | null;
}) {
  const [etat, action, enCours] = useActionState(signalerAbsenceProf, etatInitial);
  const [type, setType] = useState<Type>(absenceExistante?.type ?? "RATTRAPAGE");

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-white p-4 shadow-sm">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="classeId" value={classeId} />
        <input type="hidden" name="seanceId" value={seanceId} />
        <input type="hidden" name="type" value={type} />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("RATTRAPAGE")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${
              type === "RATTRAPAGE"
                ? "bg-brand-accent text-white"
                : "border border-slate-300 text-slate-600"
            }`}
          >
            🔁 Rattrapage à prévoir
          </button>
          <button
            type="button"
            onClick={() => setType("ARRET_MALADIE")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${
              type === "ARRET_MALADIE"
                ? "bg-status-occupee text-white"
                : "border border-slate-300 text-slate-600"
            }`}
          >
            🤒 Arrêt maladie
          </button>
        </div>

        {type === "RATTRAPAGE" && (
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Date de rattrapage (si déjà connue)
            <input
              type="date"
              name="dateRattrapage"
              defaultValue={absenceExistante?.dateRattrapage ?? ""}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
            />
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Commentaire (optionnel)
          <textarea
            name="commentaire"
            rows={2}
            defaultValue={absenceExistante?.commentaire ?? ""}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
          />
        </label>

        {etat.message && <p className="text-sm text-status-occupee">{etat.message}</p>}

        <button
          type="submit"
          disabled={enCours}
          className="self-start rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
        >
          {enCours ? "Enregistrement…" : absenceExistante ? "Mettre à jour" : "Enregistrer l'absence"}
        </button>
      </form>

      {absenceExistante && (
        <form action={retirerAbsenceProf} className="border-t border-slate-100 pt-3">
          <input type="hidden" name="classeId" value={classeId} />
          <input type="hidden" name="seanceId" value={seanceId} />
          <button type="submit" className="text-xs text-slate-500 hover:underline">
            Retirer cette absence (reprendre l&apos;appel normalement)
          </button>
        </form>
      )}
    </div>
  );
}
