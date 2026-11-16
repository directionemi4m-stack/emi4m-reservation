"use client";

import { useActionState, useState } from "react";
import { ajouterContrat, type EtatAction } from "@/app/(app)/admin/contrats/actions";
import { ChoixScan } from "@/components/achats/ChoixScan";

const champClass =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

// Dépôt du PDF d'un contrat ou d'un avenant pour un prof.
export function AjoutContrat({ profs, anneeDebut, presidencePrete }: { profs: { id: string; nom: string }[]; anneeDebut: number; presidencePrete: boolean }) {
  // La clé remonte le formulaire après chaque ajout réussi : champs et fichier vidés.
  const [cle, setCle] = useState(0);
  const [etat, action, enCours] = useActionState(async (p: EtatAction, fd: FormData) => {
    const r = await ajouterContrat(p, fd);
    if (r.succes) setCle((k) => k + 1);
    return r;
  }, { succes: true } as EtatAction);
  const [papier, setPapier] = useState(false);

  return (
    <form key={cle} action={action} className="grid gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-2">
      <h2 className="text-sm font-semibold text-brand-slate sm:col-span-2">Ajouter un contrat ou un avenant</h2>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Prof
        <select name="profId" required defaultValue="" className={champClass}>
          <option value="" disabled>
            Choisir…
          </option>
          {profs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nom}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Année scolaire
        <select name="anneeDebut" defaultValue={anneeDebut} className={champClass}>
          {[anneeDebut - 1, anneeDebut, anneeDebut + 1].map((a) => (
            <option key={a} value={a}>
              {a}-{a + 1}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="flex flex-wrap gap-4 text-sm text-slate-700">
        <label className="flex items-center gap-1.5">
          <input type="radio" name="type" value="CONTRAT" defaultChecked className="accent-brand-accent" /> Contrat
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" name="type" value="AVENANT" className="accent-brand-accent" /> Avenant
        </label>
      </fieldset>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
        Titre
        <input name="titre" required placeholder="Ex. « CDI temps partiel », « Avenant n°1 — heures »" className={champClass} />
      </label>
      <div className="sm:col-span-2">
        <ChoixScan libelle="Le document (PDF de préférence)" />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
        <input type="checkbox" name="papier" checked={papier} onChange={(e) => setPapier(e.target.checked)} className="h-4 w-4 accent-brand-accent" />
        Déjà signé sur papier : l&apos;archiver seulement
      </label>
      {!papier && (
        <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
          <input type="checkbox" name="envoyer" defaultChecked={presidencePrete} disabled={!presidencePrete} className="h-4 w-4 accent-brand-accent" />
          Envoyer tout de suite à la présidence pour signature
          {!presidencePrete && <span className="text-xs text-slate-400">(indiquez d&apos;abord la présidence dans les paramètres)</span>}
        </label>
      )}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={enCours} className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60">
          {enCours ? "Envoi…" : "Ajouter"}
        </button>
        {etat.message && <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>}
      </div>
    </form>
  );
}
