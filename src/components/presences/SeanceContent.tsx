"use client";

import { useState } from "react";
import { PointageForm, type ElevePointage as Eleve } from "@/components/presences/PointageForm";
import { AbsenceProfForm } from "@/components/presences/AbsenceProfForm";
import { basculerJourFerie } from "@/app/(app)/presences/[classeId]/[seanceId]/actions";
import type { StatutPresence, TypeAbsenceProf } from "@/generated/prisma/client";

interface AbsenceExistante {
  type: TypeAbsenceProf;
  dateRattrapage: string | null;
  commentaire: string | null;
}

type Mode = "appel" | "absence" | "ferie";

export function SeanceContent({
  classeId,
  seanceId,
  eleves,
  marquesExistantes,
  absenceExistante,
  ferie,
  dateLibelle,
}: {
  classeId: string;
  seanceId: string;
  eleves: Eleve[];
  marquesExistantes: Record<string, StatutPresence>;
  absenceExistante: AbsenceExistante | null;
  ferie: { declarePar: string } | null; // ce jour est déclaré férié (pour tous les cours)
  dateLibelle: string; // « mercredi 11 novembre »
}) {
  const [mode, setMode] = useState<Mode>(ferie ? "ferie" : absenceExistante ? "absence" : "appel");
  const onglet = (m: Mode, libelle: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`rounded-md px-3 py-1.5 font-medium ${mode === m ? "bg-brand-slate text-white" : "border border-slate-300 text-slate-600"}`}
    >
      {libelle}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 text-sm">
        {onglet("appel", "📋 Faire l'appel")}
        {onglet("absence", "🚫 Absence du prof")}
        {onglet("ferie", "🎌 Jour férié")}
      </div>

      {mode === "appel" && (
        <PointageForm classeId={classeId} seanceId={seanceId} eleves={eleves} marquesExistantes={marquesExistantes} />
      )}
      {mode === "absence" && (
        <AbsenceProfForm key={JSON.stringify(absenceExistante)} classeId={classeId} seanceId={seanceId} absenceExistante={absenceExistante} />
      )}
      {mode === "ferie" && (
        <form action={basculerJourFerie} className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
          <input type="hidden" name="classeId" value={classeId} />
          <input type="hidden" name="seanceId" value={seanceId} />
          <input type="hidden" name="ferie" value={(!ferie).toString()} />
          {ferie ? (
            <>
              <p className="text-sm text-slate-700">
                Le <strong>{dateLibelle}</strong> est déclaré <strong>jour férié</strong>
                {ferie.declarePar && ` (par ${ferie.declarePar})`} : pas de cours ce jour-là, pour tous les cours de l&apos;école.
                Aucun appel n&apos;est demandé.
              </p>
              <button type="submit" className="w-fit text-sm text-slate-500 underline hover:text-status-occupee">
                Ce n&apos;est pas un jour férié, annuler
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-700">
                Le <strong>{dateLibelle}</strong> est un jour férié ? Il vaudra pour <strong>tous les cours</strong> de l&apos;école ce
                jour-là : plus aucun appel ne sera réclamé pour cette date.
              </p>
              <button
                type="submit"
                className="w-fit rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90"
              >
                Déclarer le {dateLibelle} férié
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}
