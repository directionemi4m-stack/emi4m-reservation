"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { ajouterInscription, type EtatAction } from "@/app/(app)/saison/actions";

const ETAT_INITIAL: EtatAction = { succes: true };

const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

export interface MorceauSaisi {
  titre: string;
  compositeur: string;
  arrangeur: string;
  duree: string; // « 3'30 », relisible par lireMinutage
}

export interface InscriptionInitiale {
  id: string;
  eleveNom: string;
  instrument: string;
  morceaux: MorceauSaisi[];
  materiel: string;
  commentaire: string;
}

const VIDE: MorceauSaisi = { titre: "", compositeur: "", arrangeur: "", duree: "" };

// Inscription d'un élève (ou d'un groupe) à un événement de la saison, avec chaque œuvre
// jouée : titre, compositeur, arrangeur éventuel et durée (ce que demande la SACEM).
export function InscriptionForm({
  evenementId,
  eleves,
  instruments,
  inscription,
}: {
  evenementId: string;
  eleves: { nom: string; instrument?: string }[]; // ses élèves, puis ceux de l'annuaire
  instruments: string[];
  inscription?: InscriptionInitiale;
}) {
  const [etat, action, enCours] = useActionState(ajouterInscription, ETAT_INITIAL);
  const instrumentRef = useRef<HTMLInputElement>(null);
  // Une clé stable par ligne, pour que React ne mélange pas les champs à la suppression.
  const [lignes, setLignes] = useState(() =>
    (inscription?.morceaux.length ? inscription.morceaux : [VIDE]).map((m, i) => ({ ...m, cle: `l${i}` }))
  );
  const ajouterLigne = () => setLignes((ls) => [...ls, { ...VIDE, cle: `n${Date.now()}-${ls.length}` }]);

  // Élève choisi dans la liste : son instrument (annuaire) est proposé s'il n'est pas déjà saisi.
  function eleveChoisi(nom: string) {
    const instrument = eleves.find((e) => e.nom === nom)?.instrument;
    if (instrument && instrumentRef.current && !instrumentRef.current.value) instrumentRef.current.value = instrument;
  }

  return (
    <form
      action={action}
      className={`flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm ${inscription ? "ring-2 ring-brand-accent/40" : ""}`}
    >
      <h2 className="text-sm font-semibold text-brand-slate">
        {inscription ? `Modifier l'inscription de ${inscription.eleveNom}` : "Inscrire un élève ou un groupe"}
      </h2>
      <input type="hidden" name="evenementId" value={evenementId} />
      {inscription && <input type="hidden" name="id" value={inscription.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Élève(s) ou groupe
          <input
            name="eleveNom"
            required
            onChange={(e) => eleveChoisi(e.target.value)}
            list="hm-eleves"
            autoComplete="off"
            placeholder="Prénom Nom, ou « Ensemble de cordes »"
            defaultValue={inscription?.eleveNom}
            className={champClass}
          />
          <datalist id="hm-eleves">
            {eleves.map((e) => (
              <option key={e.nom} value={e.nom} label={e.instrument} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Instrument ou formation
          <input
            name="instrument"
            ref={instrumentRef}
            required
            list="hm-instruments"
            autoComplete="off"
            defaultValue={inscription?.instrument}
            className={champClass}
          />
          <datalist id="hm-instruments">
            {instruments.map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-medium text-slate-600">
          Œuvres jouées <span className="font-normal text-slate-400">(pour le programme et la déclaration SACEM)</span>
        </legend>
        {lignes.map((l, n) => (
          <div key={l.cle} className="grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.2fr)_5rem_auto]">
            <input
              name="morceauTitre"
              defaultValue={l.titre}
              required={n === 0}
              placeholder="Titre de l'œuvre"
              aria-label={`Titre de l'œuvre ${n + 1}`}
              className={`${champClass} col-span-2 min-w-0 lg:col-span-1`}
            />
            <input
              name="morceauCompositeur"
              defaultValue={l.compositeur}
              required={n === 0}
              placeholder="Compositeur"
              aria-label={`Compositeur de l'œuvre ${n + 1}`}
              className={`${champClass} min-w-0`}
            />
            <input
              name="morceauArrangeur"
              defaultValue={l.arrangeur}
              placeholder="Arrangeur (facult.)"
              aria-label={`Arrangeur de l'œuvre ${n + 1}`}
              className={`${champClass} min-w-0`}
            />
            <input
              name="morceauDuree"
              defaultValue={l.duree}
              required={n === 0}
              placeholder="3'30"
              aria-label={`Durée de l'œuvre ${n + 1}`}
              className={`${champClass} min-w-0`}
            />
            <button
              type="button"
              onClick={() => setLignes((ls) => ls.filter((x) => x.cle !== l.cle))}
              disabled={lignes.length === 1}
              className="inline-flex items-center justify-center rounded-md px-2 text-slate-400 hover:text-status-occupee disabled:opacity-30"
              aria-label={`Retirer l'œuvre ${n + 1}`}
            >
              <IconTrash size={16} aria-hidden />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={ajouterLigne}
          className="inline-flex w-fit items-center gap-1 text-xs font-medium text-brand-accent hover:underline"
        >
          <IconPlus size={14} aria-hidden /> Ajouter une œuvre
        </button>
        <p className="text-xs text-slate-400">Compositeur inconnu : écrire « Traditionnel » ou « Anonyme ». La durée totale est calculée.</p>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Matériel nécessaire (facultatif)
          <input name="materiel" placeholder="Ex. pupitre, ampli, piano" defaultValue={inscription?.materiel} className={champClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
          Commentaire (facultatif)
          <input name="commentaire" defaultValue={inscription?.commentaire} className={champClass} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={enCours}
          className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
        >
          {enCours ? "Enregistrement…" : inscription ? "Enregistrer" : "Inscrire"}
        </button>
        {inscription && (
          <Link href={`/saison/${evenementId}`} className="text-sm text-slate-500 hover:underline">
            Annuler
          </Link>
        )}
        {etat.message && <p className="text-sm text-status-occupee">{etat.message}</p>}
      </div>
    </form>
  );
}
