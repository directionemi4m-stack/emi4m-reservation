"use client";

import { useActionState } from "react";
import { ajouterSalle, type EtatAction } from "@/app/(app)/admin/parametres/salles/actions";

const etatInitial: EtatAction = { succes: true };

export function AjouterSalleForm({ communes }: { communes: { id: string; nom: string }[] }) {
  const [etat, action, enCours] = useActionState(ajouterSalle, etatInitial);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-brand-slate">Ajouter une salle</h2>
      <div className="flex flex-wrap gap-3">
        <select
          name="communeId"
          required
          defaultValue=""
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
        >
          <option value="" disabled>
            Choisir une commune…
          </option>
          {communes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
        <input
          type="text"
          name="nom"
          placeholder="Nom de la salle"
          required
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
        />
        <button
          type="submit"
          disabled={enCours}
          className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
        >
          {enCours ? "Ajout…" : "Ajouter"}
        </button>
      </div>
      {etat.message && (
        <p className={etat.succes ? "text-sm text-status-dispo" : "text-sm text-status-occupee"}>
          {etat.message}
        </p>
      )}
    </form>
  );
}
