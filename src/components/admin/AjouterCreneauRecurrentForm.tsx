"use client";

import { useActionState } from "react";
import {
  ajouterCreneauRecurrent,
  type EtatAction,
} from "@/app/(app)/admin/parametres/creneaux-recurrents/actions";

const etatInitial: EtatAction = { succes: true };

const JOURS = [
  { valeur: "LUNDI", label: "Lundi" },
  { valeur: "MARDI", label: "Mardi" },
  { valeur: "MERCREDI", label: "Mercredi" },
  { valeur: "JEUDI", label: "Jeudi" },
  { valeur: "VENDREDI", label: "Vendredi" },
  { valeur: "SAMEDI", label: "Samedi" },
  { valeur: "DIMANCHE", label: "Dimanche" },
];

interface Prof {
  id: string;
  nom: string;
  prenom: string;
}

interface Salle {
  id: string;
  nom: string;
  commune: { nom: string };
}

export function AjouterCreneauRecurrentForm({
  profs,
  salles,
}: {
  profs: Prof[];
  salles: Salle[];
}) {
  const [etat, action, enCours] = useActionState(ajouterCreneauRecurrent, etatInitial);

  const groupes = new Map<string, Salle[]>();
  for (const s of salles) {
    const liste = groupes.get(s.commune.nom) ?? [];
    liste.push(s);
    groupes.set(s.commune.nom, liste);
  }

  const aujourdHui = new Date().toISOString().slice(0, 10);
  const champClass =
    "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-brand-slate">Ajouter un créneau récurrent</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <select name="profId" required defaultValue="" className={champClass}>
          <option value="" disabled>
            Prof…
          </option>
          {profs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.prenom} {p.nom}
            </option>
          ))}
        </select>
        <select name="salleId" required defaultValue="" className={champClass}>
          <option value="" disabled>
            Salle…
          </option>
          {Array.from(groupes.entries()).map(([commune, sallesCommune]) => (
            <optgroup key={commune} label={commune}>
              {sallesCommune.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <select name="jourSemaine" required defaultValue="" className={champClass}>
          <option value="" disabled>
            Jour…
          </option>
          {JOURS.map((j) => (
            <option key={j.valeur} value={j.valeur}>
              {j.label}
            </option>
          ))}
        </select>
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Heure de début
          <input type="time" name="heureDebut" required className={champClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Heure de fin
          <input type="time" name="heureFin" required className={champClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Valide à partir du
          <input
            type="date"
            name="dateDebut"
            required
            defaultValue={aujourdHui}
            className={champClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 sm:col-span-3">
          Jusqu&apos;au (optionnel)
          <input type="date" name="dateFin" className={`${champClass} sm:w-48`} />
        </label>
      </div>
      {etat.message && (
        <p className={etat.succes ? "text-sm text-status-dispo" : "text-sm text-status-occupee"}>
          {etat.message}
        </p>
      )}
      <button
        type="submit"
        disabled={enCours}
        className="self-start rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
      >
        {enCours ? "Ajout…" : "Ajouter"}
      </button>
    </form>
  );
}
