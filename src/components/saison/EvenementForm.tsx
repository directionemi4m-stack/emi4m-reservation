"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { enregistrerEvenement, type EtatAction } from "@/app/(app)/saison/actions";
import { TYPES_EVENEMENT_SAISON } from "@/lib/saison";

const ETAT_INITIAL: EtatAction = { succes: true };

const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

const DUREES = [30, 45, 60, 75, 90, 105, 120, 150, 180];

function libelleDuree(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${m}` : ""}` : `${m} min`;
}

export interface EvenementInitial {
  id: string;
  type: string;
  titre: string;
  date: string; // YYYY-MM-DD
  heureDebut: string; // HH:MM ou ""
  lieuId: string;
  lieuPrecis: string;
  description: string;
  dureeMaxMinutes: number | null;
}

export function EvenementForm({
  lieux,
  sallesSuggerees,
  evenement,
  urlAnnuler,
}: {
  lieux: { id: string; nom: string }[];
  sallesSuggerees: string[];
  evenement?: EvenementInitial;
  urlAnnuler?: string;
}) {
  const [etat, action, enCours] = useActionState(enregistrerEvenement, ETAT_INITIAL);
  const [type, setType] = useState(evenement?.type ?? "HEURE_MUSICALE");

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-brand-slate">
        {evenement ? "Modifier l'événement" : "Ajouter un événement"}
      </h2>
      {evenement && <input type="hidden" name="id" value={evenement.id} />}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Type
          <select name="type" value={type} onChange={(e) => setType(e.target.value)} className={champClass}>
            {TYPES_EVENEMENT_SAISON.map((t) => (
              <option key={t.valeur} value={t.valeur}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
          Titre
          <input
            name="titre"
            required
            defaultValue={evenement?.titre}
            placeholder={type === "HEURE_MUSICALE" ? "Ex. Heure musicale de Noël" : "Ex. Concert de printemps"}
            className={champClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Date
          <input type="date" name="date" required defaultValue={evenement?.date} className={champClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Heure (facultatif)
          <input type="time" name="heureDebut" step={300} defaultValue={evenement?.heureDebut} className={champClass} />
        </label>
        {type === "HEURE_MUSICALE" && (
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Durée prévue
            <select name="dureeMaxMinutes" defaultValue={evenement?.dureeMaxMinutes ?? ""} className={champClass}>
              <option value="">Non fixée</option>
              {DUREES.map((d) => (
                <option key={d} value={d}>
                  {libelleDuree(d)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Commune
          <select name="lieuId" defaultValue={evenement?.lieuId ?? ""} className={champClass}>
            <option value="">—</option>
            {lieux.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
          Lieu précis
          <input
            name="lieuPrecis"
            list="lieux-precis"
            defaultValue={evenement?.lieuPrecis}
            placeholder="Ex. Salle Berlioz, Église, Cinéma"
            className={champClass}
          />
          <datalist id="lieux-precis">
            {sallesSuggerees.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-3">
          Description (facultatif)
          <textarea name="description" rows={2} defaultValue={evenement?.description} className={champClass} />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={enCours}
          className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
        >
          {enCours ? "Enregistrement…" : evenement ? "Enregistrer" : "Ajouter"}
        </button>
        {urlAnnuler && (
          <Link href={urlAnnuler} className="text-sm text-slate-500 hover:underline">
            Annuler
          </Link>
        )}
        {etat.message && (
          <p className={etat.succes ? "text-sm text-status-dispo" : "text-sm text-status-occupee"}>{etat.message}</p>
        )}
      </div>
    </form>
  );
}
