"use client";

import { useActionState } from "react";
import { nouvelleScene, type EtatAction } from "@/app/(app)/plans-de-scene/actions";

const champ = "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

// Nouvelle scène : nom, commune, largeur et profondeur en mètres ; les éléments fixes se
// placent ensuite dans l'éditeur.
export function NouvelleScene({ lieux }: { lieux: { id: string; nom: string }[] }) {
  const [etat, action, enCours] = useActionState(nouvelleScene, { succes: true } as EtatAction);
  return (
    <form action={action} className="grid gap-2 rounded-lg bg-white p-3 shadow-sm sm:grid-cols-5">
      <input name="nom" required placeholder="Nom (ex. La Coupole, grande scène)" className={`${champ} sm:col-span-2`} />
      <select name="lieuId" defaultValue="" className={champ}>
        <option value="">Commune…</option>
        {lieux.map((l) => (
          <option key={l.id} value={l.id}>
            {l.nom}
          </option>
        ))}
      </select>
      <input name="largeur" required inputMode="decimal" placeholder="Largeur (m)" className={champ} />
      <input name="profondeur" required inputMode="decimal" placeholder="Profondeur (m)" className={champ} />
      <div className="flex items-center gap-3 sm:col-span-5">
        <button type="submit" disabled={enCours} className="rounded-md bg-brand-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
          {enCours ? "…" : "Créer la scène"}
        </button>
        {etat.message && <span className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</span>}
      </div>
    </form>
  );
}
