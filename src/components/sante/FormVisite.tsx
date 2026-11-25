"use client";

import { useState } from "react";
import { enregistrerVisite } from "@/app/(app)/admin/sante/actions";
import { ChoixScan } from "@/components/achats/ChoixScan";
import { AVIS, LIBELLE_AVIS, LIBELLE_STATUT_VISITE, LIBELLE_TYPE_VISITE, STATUTS_VISITE, TYPES_VISITE, type StatutVisite, type TypeVisite } from "@/lib/santeTravail";
import { champClass, FormSante, libelleClass } from "./FormSante";

export interface VisiteFormulaire {
  id: string;
  type: TypeVisite;
  statut: StatutVisite;
  date: string; // AAAA-MM-JJ ou ""
  heure: string;
  lieu: string;
  avis: string;
  prochaineAvant: string;
  commentaire: string;
  aPdf: boolean;
}

// Ajout ou modification d'une visite. Les champs suivent l'état de la visite : demandée
// (sans date), convocation reçue (date, heure, lieu, prévenir le salarié), réalisée (avis,
// prochaine visite, attestation).
export function FormVisite({
  salarieId,
  visite,
  typeConseille,
  prenom,
  peutPrevenir,
}: {
  salarieId: string;
  visite?: VisiteFormulaire;
  typeConseille?: TypeVisite;
  prenom: string;
  peutPrevenir: boolean;
}) {
  const [statut, setStatut] = useState<StatutVisite>(visite?.statut ?? "PREVUE");
  const realisee = statut === "REALISEE";
  const prevue = statut === "PREVUE";

  return (
    <FormSante
      action={enregistrerVisite}
      libelle={visite ? "Enregistrer la visite" : "Ajouter la visite"}
      vider={!visite}
      onSucces={() => !visite && setStatut("PREVUE")}
      className="grid gap-3 sm:grid-cols-2"
    >
      <input type="hidden" name="salarieId" value={salarieId} />
      {visite && <input type="hidden" name="id" value={visite.id} />}
      <label className={libelleClass}>
        Type de visite
        <select name="type" defaultValue={visite?.type ?? typeConseille ?? "PERIODIQUE"} className={champClass}>
          {TYPES_VISITE.map((t) => (
            <option key={t} value={t}>
              {LIBELLE_TYPE_VISITE[t]}
            </option>
          ))}
        </select>
      </label>
      <label className={libelleClass}>
        Où en est-elle ?
        <select name="statut" value={statut} onChange={(e) => setStatut(e.target.value as StatutVisite)} className={champClass}>
          {STATUTS_VISITE.map((s) => (
            <option key={s} value={s}>
              {LIBELLE_STATUT_VISITE[s]}
            </option>
          ))}
        </select>
      </label>
      <label className={libelleClass}>
        {statut === "DEMANDEE" ? "Date (si déjà connue)" : "Date"}
        <input type="date" name="date" defaultValue={visite?.date} required={prevue || realisee} className={champClass} />
      </label>
      {(prevue || realisee) && (
        <label className={libelleClass}>
          Heure
          <input name="heure" defaultValue={visite?.heure} placeholder="Ex. 14h30" className={champClass} />
        </label>
      )}
      <label className={`${libelleClass} sm:col-span-2`}>
        Lieu
        <input name="lieu" defaultValue={visite?.lieu} placeholder="Ex. centre médical de Villard-de-Lans, ou en visio" className={champClass} />
      </label>
      {realisee && (
        <>
          <label className={libelleClass}>
            Avis remis
            <select name="avis" defaultValue={visite?.avis || "ATTESTATION"} className={champClass}>
              {AVIS.map((a) => (
                <option key={a} value={a}>
                  {LIBELLE_AVIS[a]}
                </option>
              ))}
            </select>
          </label>
          <label className={libelleClass}>
            Prochaine visite au plus tard le
            <input type="date" name="prochaineAvant" defaultValue={visite?.prochaineAvant} className={champClass} />
            <span className="font-normal text-slate-400">Si c&apos;est écrit sur l&apos;attestation ; sinon l&apos;appli applique la règle du suivi.</span>
          </label>
          <div className="sm:col-span-2">
            <ChoixScan libelle={visite?.aPdf ? "Remplacer l'attestation (PDF ou photos)" : "Attestation remise (PDF ou photos, facultatif)"} />
          </div>
        </>
      )}
      <label className={`${libelleClass} sm:col-span-2`}>
        Note (facultatif)
        <input name="commentaire" defaultValue={visite?.commentaire} placeholder="Ex. reportée à la demande du salarié" className={champClass} />
        <span className="font-normal text-slate-400">Aucune information médicale : seulement l&apos;organisation.</span>
      </label>
      {prevue && peutPrevenir && (
        <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
          <input type="checkbox" name="prevenir" defaultChecked={!visite} className="h-4 w-4 accent-brand-accent" />
          Prévenir {prenom} par mail et notification
        </label>
      )}
    </FormSante>
  );
}
