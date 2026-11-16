"use client";

import { useActionState, useState } from "react";
import { envoyerIdee, type EtatAction } from "@/app/(app)/idees/actions";
import { TEXTE_MAX, TITRE_MAX } from "@/lib/idees";

const champClass =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

// Formulaire de la boîte à idées : idée pour l'école ou amélioration de l'appli.
export function NouvelleIdee() {
  const [cle, setCle] = useState(0);
  const [type, setType] = useState<"ECOLE" | "APPLI">("ECOLE");
  const [etat, action, enCours] = useActionState(async (p: EtatAction, fd: FormData) => {
    const r = await envoyerIdee(p, fd);
    if (r.succes) setCle((k) => k + 1);
    return r;
  }, { succes: true } as EtatAction);

  return (
    <form key={cle} action={action} className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["ECOLE", "💡 Une idée pour l'école", "Cours, concerts, organisation, locaux…"],
            ["APPLI", "🛠️ Améliorer l'appli", "Ce qui manque, ce qui gêne, un bug…"],
          ] as const
        ).map(([v, lib, aide]) => (
          <label
            key={v}
            className={`flex cursor-pointer flex-col gap-0.5 rounded-md border p-2.5 text-sm ${type === v ? "border-brand-accent bg-brand-accent/5" : "border-slate-200"}`}
          >
            <input type="radio" name="type" value={v} checked={type === v} onChange={() => setType(v)} className="sr-only" />
            <span className="font-medium text-slate-800">{lib}</span>
            <span className="text-xs text-slate-500">{aide}</span>
          </label>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        En quelques mots
        <input name="titre" required maxLength={TITRE_MAX} placeholder={type === "APPLI" ? "Ex. Pouvoir copier un appel d'une semaine sur l'autre" : "Ex. Un concert commun des ateliers en juin"} className={champClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        {type === "APPLI" ? "Qu'est-ce qui vous aiderait ? Sur quelle page ?" : "Votre idée"}
        <textarea name="texte" required rows={4} maxLength={TEXTE_MAX} className={champClass} />
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="anonyme" className="h-4 w-4 accent-brand-accent" />
        Envoyer anonymement <span className="text-xs text-slate-400">(vous ne verrez pas la réponse ici)</span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enCours} className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60">
          {enCours ? "Envoi…" : "Envoyer"}
        </button>
        {etat.message && <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>}
      </div>
    </form>
  );
}
