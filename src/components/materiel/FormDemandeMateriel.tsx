"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { enregistrerDemandeMateriel, type EtatAction } from "@/app/(app)/materiel/actions";
import { DETAILS_MAX, INFOS_URGENCE, LIBELLE_MAX, QUANTITE_MAX, TITRE_MAX, URGENCES, URL_MAX, type Urgence } from "@/lib/demandesMateriel";

const champ = "min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

export interface ValeursDemande {
  id: string;
  titre: string;
  quantite: number;
  urgence: Urgence;
  details: string;
}

// Nouvelle demande de matériel (avec ses liens et prix), ou correction d'une demande.
export function FormDemandeMateriel({ valeurs, surFin }: { valeurs?: ValeursDemande; surFin?: () => void }) {
  const [cle, setCle] = useState(0);
  const [urgence, setUrgence] = useState<Urgence>(valeurs?.urgence ?? "NORMALE");
  const [lignes, setLignes] = useState(["p0"]);
  const [etat, action, enCours] = useActionState(async (p: EtatAction, fd: FormData) => {
    const r = await enregistrerDemandeMateriel(p, fd);
    if (r.succes) {
      if (valeurs) surFin?.();
      else {
        setCle((k) => k + 1);
        setUrgence("NORMALE");
        setLignes(["p0"]);
      }
    }
    return r;
  }, { succes: true } as EtatAction);
  // Envoi sans la remise à zéro automatique du formulaire : en cas d'erreur (lien ou prix mal
  // saisi), le prof garde tout ce qu'il a écrit.
  const envoyer = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };

  return (
    <form key={cle} onSubmit={envoyer} className="flex flex-col gap-3">
      {valeurs && <input type="hidden" name="id" value={valeurs.id} />}
      <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-2">
        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-600">
          Matériel demandé
          <input name="titre" required maxLength={TITRE_MAX} defaultValue={valeurs?.titre} placeholder="Ex. Pupitres pliants, cordes de violon 3/4…" className={champ} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Quantité
          <input name="quantite" type="number" min={1} max={QUANTITE_MAX} required defaultValue={valeurs?.quantite ?? 1} className={champ} />
        </label>
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-xs font-medium text-slate-600">Niveau d&apos;urgence</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {URGENCES.map((u) => (
            <label key={u} className={`flex cursor-pointer flex-col rounded-md border p-2 text-sm ${urgence === u ? "border-brand-accent bg-brand-accent/5" : "border-slate-200"}`}>
              <input type="radio" name="urgence" value={u} checked={urgence === u} onChange={() => setUrgence(u)} className="sr-only" />
              <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${INFOS_URGENCE[u].classe}`}>{INFOS_URGENCE[u].libelle}</span>
              <span className="mt-1 text-xs text-slate-500">{INFOS_URGENCE[u].aide}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Pour quoi faire ? (facultatif)
        <textarea name="details" rows={2} maxLength={DETAILS_MAX} defaultValue={valeurs?.details} placeholder="Cours, site, élèves concernés, modèle précis…" className={champ} />
      </label>

      {!valeurs && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-slate-600">Où l&apos;acheter ? Collez le lien et le prix (facultatif, plusieurs possibles pour comparer)</p>
          {lignes.map((cleLigne, n) => (
            <div key={cleLigne} className="grid grid-cols-[minmax(0,1fr)_5.5rem_auto] gap-2 rounded-md bg-slate-50 p-2">
              <input name="pLien" inputMode="url" maxLength={URL_MAX} placeholder="Lien vers le site" aria-label={`Lien ${n + 1}`} className={champ} />
              <input name="pPrix" inputMode="decimal" placeholder="Prix €" aria-label={`Prix unitaire ${n + 1}`} className={champ} />
              <button
                type="button"
                onClick={() => setLignes((l) => l.filter((x) => x !== cleLigne))}
                disabled={lignes.length === 1}
                className="p-2 text-slate-400 hover:text-status-occupee disabled:opacity-30"
                aria-label={`Retirer la proposition ${n + 1}`}
              >
                <IconTrash size={16} aria-hidden />
              </button>
              <input name="pLibelle" maxLength={LIBELLE_MAX} placeholder="Précision (modèle, couleur, port compris…)" aria-label={`Précision ${n + 1}`} className={`${champ} col-span-3`} />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLignes((l) => (l.length >= 10 ? l : [...l, `p${Date.now()}`]))}
            className="inline-flex w-fit items-center gap-1 text-xs font-medium text-brand-accent hover:underline"
          >
            <IconPlus size={14} aria-hidden /> Ajouter une autre proposition
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enCours} className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60">
          {enCours ? "Envoi…" : valeurs ? "Enregistrer" : "Envoyer la demande"}
        </button>
        {valeurs && (
          <button type="button" onClick={surFin} className="text-sm text-slate-500 hover:underline">
            Annuler
          </button>
        )}
        {etat.message && <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>}
      </div>
    </form>
  );
}
