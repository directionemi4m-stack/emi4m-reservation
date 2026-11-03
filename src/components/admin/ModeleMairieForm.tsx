"use client";

import { useState } from "react";
import { useSoumission } from "@/lib/useSoumission";
import { enregistrerModeleMairie, type EtatAction } from "@/app/(app)/admin/parametres/contacts/actions";
import { MODELE_MAIRIE_DEFAUT, VARIABLES_MAIRIE } from "@/lib/modeleMairie";

const etatInitial: EtatAction = { succes: true };
const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

// Message type proposé pour chaque demande de salle aux mairies (toujours modifiable
// au moment de l'envoi).
export function ModeleMairieForm({ sujet, corps, personnalise }: { sujet: string; corps: string; personnalise: boolean }) {
  const [etat, soumettre, enCours] = useSoumission(enregistrerModeleMairie, etatInitial);
  const [etatRaz, reinitialiser, enCoursRaz] = useSoumission(enregistrerModeleMairie, etatInitial);
  const [s, setS] = useState(sujet);
  const [c, setC] = useState(corps);

  return (
    <section id="message-mairie" className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-brand-slate">Message type pour les mairies</h2>
        <p className="text-xs text-slate-500">
          Proposé à chaque « Demande à la mairie » (vous pouvez encore l&apos;ajuster avant l&apos;envoi). Les mots
          entre accolades sont remplacés automatiquement :{" "}
          {VARIABLES_MAIRIE.map((v, i) => (
            <span key={v.cle}>
              <code className="rounded bg-slate-100 px-1">{`{${v.cle}}`}</code> {v.libelle}
              {i < VARIABLES_MAIRIE.length - 1 ? ", " : "."}
            </span>
          ))}
        </p>
      </div>
      <form onSubmit={soumettre} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Objet
          <input name="sujet" value={s} onChange={(e) => setS(e.target.value)} className={champClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Message
          <textarea name="corps" value={c} onChange={(e) => setC(e.target.value)} rows={12} className={champClass} />
        </label>
        {etat.message && <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={enCours}
            className="w-fit rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
          >
            {enCours ? "Enregistrement…" : "Enregistrer le message type"}
          </button>
        </div>
      </form>
      {personnalise && (
        <form
          onSubmit={(e) => {
            if (!window.confirm("Revenir au message d'origine ?")) {
              e.preventDefault();
              return;
            }
            setS(MODELE_MAIRIE_DEFAUT.sujet);
            setC(MODELE_MAIRIE_DEFAUT.corps);
            reinitialiser(e);
          }}
        >
          <input type="hidden" name="reinitialiser" value="1" />
          <button type="submit" disabled={enCoursRaz} className="text-xs text-slate-500 underline">
            Revenir au message d&apos;origine
          </button>
          {etatRaz.message && <span className="ml-2 text-xs text-status-dispo">{etatRaz.message}</span>}
        </form>
      )}
    </section>
  );
}
