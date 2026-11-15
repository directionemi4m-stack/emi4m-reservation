"use client";

import { useActionState, useMemo, useState } from "react";
import { enregistrerAgenda, type EtatAction } from "@/app/(app)/presences/[classeId]/actions";
import {
  datesRecurrentes,
  differenceAgenda,
  grilleDuMois,
  moisDeLaSaison,
  pendantLesVacances,
  type Periode,
} from "@/lib/agendaEnsemble";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const champClass =
  "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

export interface SeanceAgenda {
  id: string;
  date: string; // AAAA-MM-JJ
  verrouillee: boolean; // appel fait ou absence du prof : ne peut pas être retirée
}

// Le calendrier de l'année d'un ensemble : un toucher sur une date l'ajoute, un second
// l'enlève ; « Enregistrer » crée ou retire les séances correspondantes.
export function CalendrierAgenda({
  classeId,
  saison,
  jourHabituel,
  seances,
  vacances,
  feries,
  aujourdHui,
}: {
  classeId: string;
  saison: number;
  jourHabituel: number | null; // 0 = lundi
  seances: SeanceAgenda[];
  vacances: Periode[];
  feries: string[];
  aujourdHui: string;
}) {
  const [cochees, setCochees] = useState(() => new Set(seances.map((s) => s.date)));
  const [etat, action, enCours] = useActionState(enregistrerAgenda, { succes: true } as EtatAction);
  const verrouillees = useMemo(() => new Set(seances.filter((s) => s.verrouillee).map((s) => s.date)), [seances]);
  const { ajouts, retraits } = differenceAgenda(seances, [...cochees]);
  const modifie = ajouts.length > 0 || retraits.length > 0;

  // Remplissage rapide.
  const finAnnee = `${saison + 1}-06-30`;
  const [jour, setJour] = useState(jourHabituel ?? 2);
  const [pas, setPas] = useState<1 | 2>(1);
  const [du, setDu] = useState(aujourdHui > `${saison}-09-01` ? aujourdHui : `${saison}-09-01`);
  const [au, setAu] = useState(finAnnee);

  const basculer = (d: string) => {
    if (verrouillees.has(d)) return;
    setCochees((c) => {
      const n = new Set(c);
      if (n.has(d)) n.delete(d);
      else n.add(d);
      return n;
    });
  };
  const remplir = () => setCochees((c) => new Set([...c, ...datesRecurrentes({ jourSemaine: jour, du, au, pas, vacances, feries })]));
  const toutDecocher = () => setCochees(new Set(verrouillees));

  return (
    <div className="flex flex-col gap-4 pb-28 md:pb-24">
      <details className="rounded-lg bg-white p-3 shadow-sm" open={seances.length === 0}>
        <summary className="cursor-pointer text-sm font-semibold text-brand-slate">Remplir rapidement</summary>
        <div className="mt-3 flex flex-wrap items-end gap-2 text-xs text-slate-600">
          <label className="flex flex-col gap-1">
            Jour
            <select value={jour} onChange={(e) => setJour(Number(e.target.value))} className={champClass}>
              {JOURS.slice(0, 6).map((j, i) => (
                <option key={j} value={i}>
                  {j}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Rythme
            <select value={pas} onChange={(e) => setPas(Number(e.target.value) as 1 | 2)} className={champClass}>
              <option value={1}>Chaque semaine</option>
              <option value={2}>Une semaine sur deux</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Du
            <input type="date" value={du} onChange={(e) => setDu(e.target.value)} className={champClass} />
          </label>
          <label className="flex flex-col gap-1">
            Au
            <input type="date" value={au} onChange={(e) => setAu(e.target.value)} className={champClass} />
          </label>
          <button
            type="button"
            onClick={remplir}
            className="rounded-md border border-brand-accent px-3 py-1.5 text-sm font-medium text-brand-accent hover:bg-brand-accent/10"
          >
            Cocher ces dates
          </button>
          <button type="button" onClick={toutDecocher} className="px-2 py-1.5 text-sm text-slate-500 underline">
            Tout décocher
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">Vacances et jours fériés sont sautés. Vous pouvez ensuite retoucher date par date.</p>
      </details>

      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-brand-accent" /> séance prévue
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-status-dispo" /> appel fait (verrouillée)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-slate-200" /> vacances
        </span>
        <span>🎌 jour férié</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {moisDeLaSaison(saison).map(({ annee, mois }) => {
          const jours = grilleDuMois(annee, mois);
          const nb = jours.filter((d) => d && cochees.has(d)).length;
          return (
            <section key={`${annee}-${mois}`} className="rounded-lg bg-white p-3 shadow-sm">
              <h2 className="mb-2 flex justify-between text-sm font-semibold text-brand-slate">
                {MOIS[mois]} {annee}
                {nb > 0 && <span className="text-xs font-normal text-slate-500">{nb} date{nb > 1 ? "s" : ""}</span>}
              </h2>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-400">
                {JOURS.map((j) => (
                  <span key={j}>{j.slice(0, 2)}</span>
                ))}
                {jours.map((d, i) => {
                  if (!d) return <span key={`v${i}`} />;
                  const coche = cochees.has(d);
                  const verrou = verrouillees.has(d);
                  const ferie = feries.includes(d);
                  const vac = pendantLesVacances(d, vacances);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => basculer(d)}
                      disabled={verrou}
                      aria-pressed={coche}
                      title={verrou ? "Appel fait : séance verrouillée" : ferie ? "Jour férié" : vac ? "Vacances" : undefined}
                      className={`relative aspect-square rounded-md text-sm ${
                        verrou
                          ? "bg-status-dispo font-semibold text-white"
                          : coche
                            ? "bg-brand-accent font-semibold text-white"
                            : vac
                              ? "bg-slate-100 text-slate-300 hover:bg-slate-200"
                              : `hover:bg-brand-accent/10 ${d === aujourdHui ? "ring-1 ring-brand-accent" : ""} ${
                                  ferie ? "text-status-occupee" : "text-slate-700"
                                }`
                      }`}
                    >
                      {Number(d.slice(8))}
                      {ferie && <span className="absolute -right-0.5 -top-1 text-[9px]">🎌</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <form
        action={action}
        className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white p-4 shadow-lg md:bottom-0"
      >
        <input type="hidden" name="classeId" value={classeId} />
        <input type="hidden" name="dates" value={JSON.stringify([...cochees].sort())} />
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600">
            <strong>{cochees.size}</strong> date{cochees.size > 1 ? "s" : ""} dans l&apos;année
            {modifie && (
              <span className="text-status-attente">
                {" "}
                · {ajouts.length > 0 && `+${ajouts.length}`} {retraits.length > 0 && `−${retraits.length}`} à enregistrer
              </span>
            )}
            {!modifie && etat.message && <span className={etat.succes ? "text-status-dispo" : "text-status-occupee"}> · {etat.message}</span>}
          </p>
          <button
            type="submit"
            disabled={enCours || !modifie}
            className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-50"
          >
            {enCours ? "Enregistrement…" : "Enregistrer l'agenda"}
          </button>
        </div>
      </form>
    </div>
  );
}
