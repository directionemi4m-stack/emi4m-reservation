"use client";

import { useEffect, useRef, useState } from "react";
import { useSoumission } from "@/lib/useSoumission";
import { ajouterEleveCham, type EtatAction } from "@/app/(app)/cham/actions";

const etatInitial: EtatAction = { succes: true };

const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

export function AjouterEleveChamForm() {
  const [ouvert, setOuvert] = useState(false);
  const [etat, soumettre, enCours] = useSoumission(ajouterEleveCham, etatInitial);
  const formRef = useRef<HTMLFormElement>(null);

  // Vide le formulaire une fois l'élève ajouté, pour enchaîner les saisies.
  useEffect(() => {
    if (etat.succes && etat.message) formRef.current?.reset();
  }, [etat]);

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="w-fit rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90"
      >
        + Ajouter un élève
      </button>
    );
  }

  return (
    <form ref={formRef} onSubmit={soumettre} className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-brand-slate">Ajouter un élève CHAM</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input name="prenom" required placeholder="Prénom" className={champClass} />
        <input name="nom" required placeholder="Nom" className={champClass} />
        <input name="age" type="number" min={3} max={25} placeholder="Âge" className={champClass} />
        <input name="telephone" placeholder="Téléphone" className={champClass} />
        <input name="email" type="email" placeholder="E-mail" className={champClass} />
        <input name="ville" placeholder="Ville" className={champClass} />
      </div>
      <p className="text-xs text-slate-400">
        L&apos;autorisation de sortie démarre en « À renseigner » : elle se règle ensuite sur la fiche.
      </p>
      {etat.message && (
        <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={enCours}
          className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
        >
          {enCours ? "Ajout…" : "Ajouter"}
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
        >
          Fermer
        </button>
      </div>
    </form>
  );
}
