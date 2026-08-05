"use client";

import { useActionState } from "react";
import { ajouterProf, type EtatAjoutProf } from "@/app/(app)/admin/parametres/profs/actions";

const etatInitial: EtatAjoutProf = { statut: "idle" };

export function AjouterProfForm() {
  const [etat, action, enCours] = useActionState(ajouterProf, etatInitial);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-brand-slate">Ajouter un prof</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <input
          type="text"
          name="prenom"
          placeholder="Prénom"
          required
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
        />
        <input
          type="text"
          name="nom"
          placeholder="Nom"
          required
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
        />
        <input
          type="email"
          name="email"
          placeholder="email@exemple.fr"
          required
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
        />
        <select
          name="role"
          defaultValue="PROF"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
        >
          <option value="PROF">Prof</option>
          <option value="ADMIN">Direction</option>
        </select>
      </div>
      {etat.statut === "erreur" && <p className="text-sm text-status-occupee">{etat.message}</p>}
      {etat.statut === "succes" && <p className="text-sm text-status-dispo">{etat.message}</p>}
      <button
        type="submit"
        disabled={enCours}
        className="self-start rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
      >
        {enCours ? "Ajout en cours…" : "Ajouter"}
      </button>
    </form>
  );
}
