"use client";

import { useState, type ReactNode } from "react";
import { useSoumission, type EtatSoumission } from "@/lib/useSoumission";

export const champClass =
  "w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";
export const libelleClass = "flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-600";

// Formulaire du module santé au travail : message de réussite ou d'erreur sous le bouton ;
// « vider » remet les champs à zéro après un ajout réussi.
export function FormSante({
  action,
  libelle,
  enCours: libelleEnCours = "Enregistrement…",
  vider = false,
  secondaire = false,
  onSucces,
  className = "",
  children,
}: {
  action: (etat: EtatSoumission, fd: FormData) => Promise<EtatSoumission>;
  libelle: string;
  enCours?: string;
  vider?: boolean;
  secondaire?: boolean;
  onSucces?: () => void;
  className?: string;
  children?: ReactNode;
}) {
  const [cle, setCle] = useState(0);
  const [etat, soumettre, enCours] = useSoumission(async (precedent, fd) => {
    const r = await action(precedent, fd);
    if (r.succes) {
      if (vider) setCle((k) => k + 1);
      onSucces?.();
    }
    return r;
  }, { succes: true });

  return (
    <form key={cle} onSubmit={soumettre} className={className}>
      {children}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={enCours}
          className={
            secondaire
              ? "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              : "rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60"
          }
        >
          {enCours ? libelleEnCours : libelle}
        </button>
        {etat.message && <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>}
      </div>
    </form>
  );
}
