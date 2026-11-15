"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { modifierDateSeance, type EtatAction } from "@/app/(app)/presences/[classeId]/actions";
import type { TypeAbsenceProf } from "@/generated/prisma/client";

const etatInitial: EtatAction = { succes: true };

function formatterDateLongue(date: Date) {
  return date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

interface Absence {
  type: TypeAbsenceProf;
  dateRattrapage: Date | null;
}

function libelleAbsence(absence: Absence) {
  if (absence.type === "ARRET_MALADIE") return "🤒 Arrêt maladie";
  if (absence.dateRattrapage) {
    return `🔁 Rattrapage le ${absence.dateRattrapage.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`;
  }
  return "🔁 Rattrapage à prévoir";
}

export function SeanceRow({
  classeId,
  seanceId,
  date,
  numero,
  fait,
  ferie = false,
  prochaine,
  absence,
  exceptions = null,
}: {
  classeId: string;
  seanceId: string;
  date: Date;
  numero: number;
  fait: boolean;
  ferie?: boolean; // jour férié déclaré : pas de cours
  prochaine: boolean;
  absence: Absence | null;
  // Ensembles : horaire et lieu propres à cette date (null : cours ordinaire, sans ces champs).
  exceptions?: { horaire: string | null; lieu: string | null } | null;
}) {
  const [modifier, setModifier] = useState(false);
  // Le formulaire ne se referme qu'une fois l'enregistrement réussi (le refermer au clic
  // le retirait de la page avant l'envoi : la modification était perdue).
  const [etat, action, enCours] = useActionState(async (precedent: EtatAction, donnees: FormData) => {
    const resultat = await modifierDateSeance(precedent, donnees);
    if (resultat.succes) setModifier(false);
    return resultat;
  }, etatInitial);

  return (
    <div
      className={`flex items-center gap-3 rounded-lg p-3 ${
        ferie && !fait
          ? "bg-slate-100"
          : absence
          ? absence.type === "ARRET_MALADIE"
            ? "bg-status-occupee/10"
            : "bg-status-attente/10"
          : fait
            ? "bg-status-dispo/10"
            : prochaine
              ? "bg-brand-accent/10"
              : "bg-white"
      } shadow-sm`}
    >
      <span className="w-6 text-center text-xs font-semibold text-slate-400">{numero}</span>

      {!modifier ? (
        <>
          <Link href={`/presences/${classeId}/${seanceId}`} className="flex-1">
            <p className="text-sm font-medium text-slate-700">{formatterDateLongue(date)}</p>
            <p className="text-xs text-slate-500">
              {ferie && !fait
                ? "🎌 Jour férié"
                : absence
                ? libelleAbsence(absence)
                : fait
                  ? "✓ Appel fait"
                  : prochaine
                    ? "Prochaine séance"
                    : "À venir"}
              {exceptions && (exceptions.horaire || exceptions.lieu) && (
                <span className="ml-1 text-brand-accent">· {[exceptions.horaire, exceptions.lieu].filter(Boolean).join(", ")}</span>
              )}
            </p>
          </Link>
          <button
            type="button"
            onClick={() => setModifier(true)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
            title={exceptions ? "Modifier la date, l'horaire ou le lieu" : "Modifier la date"}
          >
            📅
          </button>
        </>
      ) : (
        <form action={action} className="flex flex-1 flex-wrap items-center gap-2">
          <input type="hidden" name="classeId" value={classeId} />
          <input type="hidden" name="seanceId" value={seanceId} />
          <input
            type="date"
            name="date"
            defaultValue={date.toISOString().slice(0, 10)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
          {exceptions && (
            <>
              <input
                name="horaire"
                defaultValue={exceptions.horaire ?? ""}
                placeholder="Horaire (si différent)"
                className="w-36 rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
              <input
                name="lieu"
                defaultValue={exceptions.lieu ?? ""}
                placeholder="Lieu (si différent)"
                className="w-36 rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
            </>
          )}
          <button
            type="submit"
            disabled={enCours}
            className="rounded-md bg-brand-accent px-3 py-1 text-xs font-semibold text-white hover:bg-brand-accent/90"
          >
            Enregistrer
          </button>
          <button
            type="button"
            onClick={() => setModifier(false)}
            className="text-xs text-slate-500 hover:underline"
          >
            Annuler
          </button>
        </form>
      )}
      {etat.message && <p className="text-xs text-status-occupee">{etat.message}</p>}
    </div>
  );
}
