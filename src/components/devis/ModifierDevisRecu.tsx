"use client";

import { useActionState, useState } from "react";
import { modifierDevisRecu, type EtatAction } from "@/app/(app)/admin/devis/actions";

const champClass =
  "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

export interface DevisRecuModifiable {
  id: string;
  fournisseur: string;
  date: string; // AAAA-MM-JJ
  montant: string; // « 1250,00 » ou vide
  objet: string;
  valableJusquAu: string; // AAAA-MM-JJ ou vide
}

// Correction d'un devis reçu : montant, objet, validité, fournisseur, date.
export function ModifierDevisRecu({ devis }: { devis: DevisRecuModifiable }) {
  const [ouvert, setOuvert] = useState(false);
  const [etat, action, enCours] = useActionState(async (p: EtatAction, fd: FormData) => {
    const r = await modifierDevisRecu(p, fd);
    if (r.succes) setOuvert(false);
    return r;
  }, { succes: true } as EtatAction);

  if (!ouvert) {
    return (
      <button type="button" onClick={() => setOuvert(true)} className="text-xs text-brand-accent hover:underline">
        {devis.montant ? "Modifier" : "Ajouter le montant…"}
      </button>
    );
  }
  return (
    <form action={action} className="grid w-full gap-2 rounded-md bg-slate-50 p-2 sm:grid-cols-2">
      <input type="hidden" name="id" value={devis.id} />
      <label className="flex flex-col gap-1 text-xs text-slate-600">
        Fournisseur
        <input name="fournisseur" required defaultValue={devis.fournisseur} className={champClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-600">
        Date du devis
        <input type="date" name="date" defaultValue={devis.date} className={champClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-600">
        Montant TTC (€)
        <input name="montant" inputMode="decimal" defaultValue={devis.montant} placeholder="Ex. 1 250,00" autoFocus className={champClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-600">
        Valable jusqu&apos;au
        <input type="date" name="valableJusquAu" defaultValue={devis.valableJusquAu} className={champClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-600 sm:col-span-2">
        Objet
        <input name="objet" defaultValue={devis.objet} className={champClass} />
      </label>
      <div className="flex items-center gap-2 sm:col-span-2">
        <button type="submit" disabled={enCours} className="rounded-md bg-brand-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60">
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} className="text-xs text-slate-500 hover:underline">
          Annuler
        </button>
        {etat.message && !etat.succes && <p className="text-xs text-status-occupee">{etat.message}</p>}
      </div>
    </form>
  );
}
