"use client";

import { useActionState, useState } from "react";
import { enregistrerRubrique, type EtatAction } from "@/app/(app)/admin/devis/actions";

const champClass =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

export interface RubriqueVue {
  id: string;
  libelle: string;
  description: string | null;
  unite: string | null;
  prix: string; // « 45 » ou « 45,50 », vide si à saisir à chaque devis
}

// Ajout ou modification d'une prestation type.
export function RubriqueForm({ rubrique }: { rubrique?: RubriqueVue }) {
  const [ouvert, setOuvert] = useState(false);
  const [etat, action, enCours] = useActionState(async (p: EtatAction, fd: FormData) => {
    const r = await enregistrerRubrique(p, fd);
    if (r.succes) setOuvert(false);
    return r;
  }, { succes: true } as EtatAction);

  if (!ouvert) {
    return (
      <span className="inline-flex items-center gap-2">
        <button type="button" onClick={() => setOuvert(true)} className={rubrique ? "text-xs text-brand-accent hover:underline" : "rounded-md bg-brand-accent px-3 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90"}>
          {rubrique ? "Modifier" : "+ Ajouter une prestation"}
        </button>
        {etat.message && etat.succes && <span className="text-xs text-status-dispo">{etat.message}</span>}
      </span>
    );
  }
  return (
    <form action={action} className="grid w-full gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[2fr_1fr_1fr]">
      {rubrique && <input type="hidden" name="id" value={rubrique.id} />}
      <input name="libelle" required defaultValue={rubrique?.libelle} placeholder="Nom (ex. Intervention en crèche)" aria-label="Nom de la prestation" className={champClass} />
      <input name="unite" defaultValue={rubrique?.unite ?? ""} placeholder="Unité (heure, séance…)" aria-label="Unité" className={champClass} />
      <input name="prix" inputMode="decimal" defaultValue={rubrique?.prix} placeholder="Prix unitaire €" aria-label="Prix unitaire en euros" className={champClass} />
      <input name="description" defaultValue={rubrique?.description ?? ""} placeholder="Précision imprimée sur le devis (facultatif)" aria-label="Précision" className={`${champClass} sm:col-span-3`} />
      <div className="flex items-center gap-2 sm:col-span-3">
        <button type="submit" disabled={enCours} className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60">
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} className="text-sm text-slate-500 hover:underline">
          Annuler
        </button>
        {etat.message && !etat.succes && <p className="text-sm text-status-occupee">{etat.message}</p>}
      </div>
    </form>
  );
}
