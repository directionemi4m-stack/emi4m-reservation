"use client";

import { useActionState, useState } from "react";
import { useSoumission } from "@/lib/useSoumission";
import {
  enregistrerSortieCham,
  modifierEleveCham,
  supprimerEleveCham,
  type EtatAction,
} from "@/app/(app)/cham/actions";
import { BoutonConfirmation } from "@/components/admin/BoutonConfirmation";
import {
  AUTORISATIONS,
  LIBELLE_AUTORISATION,
  STYLE_AUTORISATION,
  formaterTelephone,
  lienTelephone,
} from "@/lib/cham";
import type { AutorisationSortie } from "@/generated/prisma/client";

export interface EleveChamVue {
  id: string;
  prenom: string;
  nom: string;
  age: number | null;
  telephone: string | null;
  email: string | null;
  ville: string | null;
  autorisationSortie: AutorisationSortie;
  precisionsSortie: string | null;
}

const etatInitial: EtatAction = { succes: true };

const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

export function LigneEleveCham({ eleve, estAdmin }: { eleve: EleveChamVue; estAdmin: boolean }) {
  const [edition, setEdition] = useState(false);
  const [etatSortie, soumettreSortie, enCoursSortie] = useSoumission(enregistrerSortieCham, etatInitial);
  const [etatEdition, soumettreEdition, enCoursEdition] = useSoumission(modifierEleveCham, etatInitial);
  const [etatSuppr, actionSuppr, enCoursSuppr] = useActionState(supprimerEleveCham, etatInitial);

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-slate">
            {eleve.nom.toUpperCase()} {eleve.prenom}
          </p>
          <p className="text-xs text-slate-500">
            {[eleve.age != null ? `${eleve.age} ans` : null, eleve.ville].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
            {eleve.telephone && (
              <a href={lienTelephone(eleve.telephone)} className="text-brand-accent hover:underline">
                {formaterTelephone(eleve.telephone)}
              </a>
            )}
            {eleve.email && (
              <a href={`mailto:${eleve.email}`} className="break-all text-brand-accent hover:underline">
                {eleve.email}
              </a>
            )}
            {!eleve.telephone && !eleve.email && (
              <span className="text-xs text-slate-400">Aucun contact renseigné</span>
            )}
          </p>
        </div>

        {estAdmin ? (
          <form onSubmit={soumettreSortie} className="flex flex-col gap-1.5 sm:w-72">
            <input type="hidden" name="id" value={eleve.id} />
            <select
              name="autorisationSortie"
              defaultValue={eleve.autorisationSortie}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              disabled={enCoursSortie}
              className={`${champClass} ${STYLE_AUTORISATION[eleve.autorisationSortie]}`}
              aria-label="Autorisation de sortie"
            >
              {AUTORISATIONS.map((a) => (
                <option key={a} value={a}>
                  {LIBELLE_AUTORISATION[a]}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                name="precisionsSortie"
                defaultValue={eleve.precisionsSortie ?? ""}
                placeholder="Précisions (ex. part avec sa sœur)"
                maxLength={300}
                className={`${champClass} min-w-0 flex-1`}
              />
              <button
                type="submit"
                disabled={enCoursSortie}
                className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                OK
              </button>
            </div>
            {etatSortie.message && (
              <p className={`text-xs ${etatSortie.succes ? "text-status-dispo" : "text-status-occupee"}`}>
                {etatSortie.succes ? "✓ " : ""}
                {etatSortie.message}
              </p>
            )}
          </form>
        ) : (
          <div className="flex flex-col gap-1 sm:items-end sm:text-right">
            <span
              className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLE_AUTORISATION[eleve.autorisationSortie]}`}
            >
              {LIBELLE_AUTORISATION[eleve.autorisationSortie]}
            </span>
            {eleve.precisionsSortie && (
              <p className="max-w-64 text-xs text-slate-500">{eleve.precisionsSortie}</p>
            )}
          </div>
        )}
      </div>

      {estAdmin && (
        <div className="flex items-center gap-4 border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={() => setEdition((v) => !v)}
            className="text-xs font-medium text-brand-accent hover:underline"
          >
            {edition ? "Fermer" : "Modifier la fiche"}
          </button>
          <form action={actionSuppr}>
            <input type="hidden" name="id" value={eleve.id} />
            <BoutonConfirmation
              message={`Supprimer ${eleve.prenom} ${eleve.nom} de la liste CHAM ?`}
              disabled={enCoursSuppr}
              className="text-xs font-medium text-status-occupee hover:underline disabled:opacity-60"
            >
              Supprimer
            </BoutonConfirmation>
          </form>
          {etatSuppr.message && <p className="text-xs text-status-occupee">{etatSuppr.message}</p>}
        </div>
      )}

      {estAdmin && edition && (
        <form onSubmit={soumettreEdition} className="flex flex-col gap-3 rounded-md bg-slate-50 p-3">
          <input type="hidden" name="id" value={eleve.id} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input name="prenom" required defaultValue={eleve.prenom} placeholder="Prénom" className={champClass} />
            <input name="nom" required defaultValue={eleve.nom} placeholder="Nom" className={champClass} />
            <input
              name="age"
              type="number"
              min={3}
              max={25}
              defaultValue={eleve.age ?? ""}
              placeholder="Âge"
              className={champClass}
            />
            <input name="telephone" defaultValue={eleve.telephone ?? ""} placeholder="Téléphone" className={champClass} />
            <input name="email" type="email" defaultValue={eleve.email ?? ""} placeholder="E-mail" className={champClass} />
            <input name="ville" defaultValue={eleve.ville ?? ""} placeholder="Ville" className={champClass} />
          </div>
          {etatEdition.message && (
            <p className={`text-sm ${etatEdition.succes ? "text-status-dispo" : "text-status-occupee"}`}>
              {etatEdition.message}
            </p>
          )}
          <div>
            <button
              type="submit"
              disabled={enCoursEdition}
              className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
            >
              {enCoursEdition ? "Enregistrement…" : "Enregistrer la fiche"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
