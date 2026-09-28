"use client";

import { useActionState, useState } from "react";
import { ajouterActivite, type EtatAction } from "@/app/(app)/activite-accessoire/actions";
import { DUREES_ACCESSOIRE } from "@/lib/activiteAccessoire";

interface TypeEvenement {
  id: string;
  nom: string;
}

const ETAT_INITIAL: EtatAction = { succes: true };

const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

export function AjouterActiviteForm({
  typesEvenement,
  profIdCible,
}: {
  typesEvenement: TypeEvenement[];
  profIdCible?: string;
}) {
  const [etat, action, enCours] = useActionState(ajouterActivite, ETAT_INITIAL);
  const [typeEvenementId, setTypeEvenementId] = useState("");
  const [duree, setDuree] = useState("");
  const aujourdHui = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-brand-slate">Déclarer une activité accessoire</h2>
      {profIdCible && <input type="hidden" name="profId" value={profIdCible} />}
      <div className="flex flex-wrap gap-3">
        <input type="date" name="date" required defaultValue={aujourdHui} className={champClass} />
        <select
          name="typeEvenementId"
          required
          value={typeEvenementId}
          onChange={(e) => setTypeEvenementId(e.target.value)}
          className={champClass}
        >
          <option value="" disabled>
            Type d&apos;événement…
          </option>
          {typesEvenement.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nom}
            </option>
          ))}
        </select>
        <select
          name="duree"
          required
          value={duree}
          onChange={(e) => setDuree(e.target.value)}
          className={champClass}
        >
          <option value="" disabled>
            Durée…
          </option>
          {DUREES_ACCESSOIRE.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={enCours || !typeEvenementId || !duree}
          className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
        >
          {enCours ? "Ajout…" : "Ajouter"}
        </button>
      </div>
      {etat.message && <p className="text-sm text-status-occupee">{etat.message}</p>}
    </form>
  );
}
