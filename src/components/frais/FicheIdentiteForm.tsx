"use client";

import { useActionState } from "react";
import { enregistrerIdentite, type EtatAction } from "@/app/(app)/frais/actions";

interface Identite {
  adresseDomicile: string | null;
  numeroPermis: string | null;
  numeroCarteGrise: string | null;
  numeroAssuranceAuto: string | null;
  immatriculationVehicule: string | null;
  marqueModeleVehicule: string | null;
  puissanceFiscale: string | null;
}

const ETAT_INITIAL: EtatAction = { succes: true };

const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

const CHAMPS: Array<{ nom: keyof Identite; label: string; placeholder?: string }> = [
  { nom: "adresseDomicile", label: "Adresse du domicile" },
  { nom: "numeroPermis", label: "N° de permis de conduire" },
  { nom: "numeroCarteGrise", label: "N° de carte grise" },
  { nom: "numeroAssuranceAuto", label: "N° d'assurance auto" },
  { nom: "immatriculationVehicule", label: "Immatriculation du véhicule utilisé" },
  { nom: "marqueModeleVehicule", label: "Marque et modèle", placeholder: "Ex. Peugeot 208" },
  { nom: "puissanceFiscale", label: "Puissance fiscale", placeholder: "Ex. 5 CV" },
];

export function FicheIdentiteForm({ identite }: { identite: Identite | null }) {
  const [etat, action, enCours] = useActionState(enregistrerIdentite, ETAT_INITIAL);

  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        {CHAMPS.map(({ nom, label, placeholder }) => (
          <label key={nom} className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            {label}
            <input
              type="text"
              name={nom}
              defaultValue={identite?.[nom] ?? ""}
              placeholder={placeholder}
              className={champClass}
            />
          </label>
        ))}
      </div>
      <div>
        <button
          type="submit"
          disabled={enCours}
          className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
        >
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
      {etat.message && (
        <p className={etat.succes ? "text-sm text-status-dispo" : "text-sm text-status-occupee"}>
          {etat.message}
        </p>
      )}
    </form>
  );
}
