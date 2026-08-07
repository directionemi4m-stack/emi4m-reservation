"use client";

import { useState } from "react";
import { PointageForm } from "@/components/presences/PointageForm";
import { AbsenceProfForm } from "@/components/presences/AbsenceProfForm";
import type { StatutPresence, TypeAbsenceProf } from "@/generated/prisma/client";

interface Eleve {
  id: string;
  nom: string;
}

interface AbsenceExistante {
  type: TypeAbsenceProf;
  dateRattrapage: string | null;
  commentaire: string | null;
}

export function SeanceContent({
  classeId,
  seanceId,
  eleves,
  marquesExistantes,
  absenceExistante,
}: {
  classeId: string;
  seanceId: string;
  eleves: Eleve[];
  marquesExistantes: Record<string, StatutPresence>;
  absenceExistante: AbsenceExistante | null;
}) {
  const [mode, setMode] = useState<"appel" | "absence">(absenceExistante ? "absence" : "appel");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode("appel")}
          className={`rounded-md px-3 py-1.5 font-medium ${
            mode === "appel"
              ? "bg-brand-slate text-white"
              : "border border-slate-300 text-slate-600"
          }`}
        >
          📋 Faire l&apos;appel
        </button>
        <button
          type="button"
          onClick={() => setMode("absence")}
          className={`rounded-md px-3 py-1.5 font-medium ${
            mode === "absence"
              ? "bg-brand-slate text-white"
              : "border border-slate-300 text-slate-600"
          }`}
        >
          🚫 Absence du prof
        </button>
      </div>

      {mode === "appel" ? (
        <PointageForm
          classeId={classeId}
          seanceId={seanceId}
          eleves={eleves}
          marquesExistantes={marquesExistantes}
        />
      ) : (
        <AbsenceProfForm
          key={JSON.stringify(absenceExistante)}
          classeId={classeId}
          seanceId={seanceId}
          absenceExistante={absenceExistante}
        />
      )}
    </div>
  );
}
