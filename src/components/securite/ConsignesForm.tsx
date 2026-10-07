"use client";

import { useActionState } from "react";
import { enregistrerConsignes, type EtatAction } from "@/app/(app)/admin/parametres/securite/actions";
import { ecrireContact, type ConsignesContenu } from "@/lib/consignesSecurite";

const ETAT_INITIAL: EtatAction = { succes: true };

const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

function Champ({ label, aide, children }: { label: string; aide?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
      {label}
      {children}
      {aide && <span className="font-normal text-slate-400">{aide}</span>}
    </label>
  );
}

function Bloc({ titre, couleur, children }: { titre: string; couleur: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4">
      <legend className={`rounded px-2 py-0.5 text-xs font-bold uppercase text-white ${couleur}`}>{titre}</legend>
      {children}
    </fieldset>
  );
}

export function ConsignesForm({ consignes }: { consignes: ConsignesContenu }) {
  const [etat, action, enCours] = useActionState(enregistrerConsignes, ETAT_INITIAL);
  const { incendie, evacuation, accident } = consignes;

  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ label="Nom de l'établissement">
          <input name="nomEtablissement" defaultValue={consignes.nomEtablissement} className={champClass} />
        </Champ>
        <Champ label="Adresse">
          <input name="adresse" defaultValue={consignes.adresse} className={champClass} />
        </Champ>
      </div>

      <Bloc titre="Incendie" couleur="bg-red-700">
        <Champ label="Prévenir" aide="Une personne par ligne, au format « Nom : numéro ».">
          <textarea
            name="prevenir"
            rows={3}
            defaultValue={incendie.prevenir.map(ecrireContact).join("\n")}
            className={champClass}
          />
        </Champ>
        <Champ label="Numéro des secours">
          <input name="incendieNumero" required defaultValue={incendie.numeroSecours} className={champClass} />
        </Champ>
        <Champ label="Équipiers première intervention" aide="Un par ligne, dans l'ordre.">
          <textarea name="equipiers" rows={3} defaultValue={incendie.equipiers.join("\n")} className={champClass} />
        </Champ>
      </Bloc>

      <Bloc titre="Évacuation" couleur="bg-green-700">
        <Champ label="Point de rassemblement">
          <input
            name="pointRassemblement"
            required
            defaultValue={evacuation.pointRassemblement}
            className={champClass}
          />
        </Champ>
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ label="Guide-file">
            <input name="guideFile" defaultValue={evacuation.guideFile} className={champClass} />
          </Champ>
          <Champ label="Serre-file">
            <input name="serreFile" defaultValue={evacuation.serreFile} className={champClass} />
          </Champ>
        </div>
      </Bloc>

      <Bloc titre="Accident / blessé / malaise" couleur="bg-orange-600">
        <Champ label="Numéro des secours">
          <input name="accidentNumero" required defaultValue={accident.numeroSecours} className={champClass} />
        </Champ>
        <Champ label="Défibrillateur">
          <input name="defibrillateur" defaultValue={accident.defibrillateur} className={champClass} />
        </Champ>
        <Champ label="Secouristes - sauveteurs" aide="Un par ligne, dans l'ordre.">
          <textarea name="secouristes" rows={3} defaultValue={accident.secouristes.join("\n")} className={champClass} />
        </Champ>
        <Champ label="Trousse d'urgence">
          <input name="trousseUrgence" defaultValue={accident.trousseUrgence} className={champClass} />
        </Champ>
      </Bloc>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={enCours}
          className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
        >
          {enCours ? "Enregistrement…" : "Enregistrer les consignes"}
        </button>
        {etat.message && (
          <p className={etat.succes ? "text-sm text-status-dispo" : "text-sm text-status-occupee"}>{etat.message}</p>
        )}
      </div>
    </form>
  );
}
