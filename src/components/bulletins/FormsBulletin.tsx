"use client";

import { useEffect, useRef } from "react";
import { useSoumission } from "@/lib/useSoumission";
import {
  ajouterSuivi,
  recompilerBulletin,
  signerAppreciation,
  signerBilan,
  type EtatAction,
} from "@/app/(app)/bulletins-cham/actions";
import { MATIERES_CHAM } from "@/lib/bulletinsCham";
import { PadSignature } from "@/components/bulletins/PadSignature";

const etatInitial: EtatAction = { succes: true };

const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";
const boutonClass =
  "w-fit rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60";

function Message({ etat }: { etat: EtatAction }) {
  if (!etat.message) return null;
  return <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>;
}

export function AjouterSuiviForm({ eleves }: { eleves: { id: string; libelle: string }[] }) {
  const [etat, soumettre, enCours] = useSoumission(ajouterSuivi, etatInitial);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (etat.succes && etat.message) formRef.current?.reset();
  }, [etat]);

  return (
    <form ref={formRef} onSubmit={soumettre} className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-brand-slate">Ajouter un de mes élèves</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <select name="eleveId" required defaultValue="" className={champClass}>
          <option value="" disabled>
            Élève…
          </option>
          {eleves.map((e) => (
            <option key={e.id} value={e.id}>
              {e.libelle}
            </option>
          ))}
        </select>
        <select name="matiere" required defaultValue="" className={champClass}>
          <option value="" disabled>
            Rubrique du bulletin…
          </option>
          {MATIERES_CHAM.map((m) => (
            <option key={m.valeur} value={m.valeur}>
              {m.label}
            </option>
          ))}
        </select>
        <input name="precision" maxLength={60} placeholder="Précision (ex. Piano, Chorale)" className={champClass} />
      </div>
      <Message etat={etat} />
      <button type="submit" disabled={enCours} className={boutonClass}>
        {enCours ? "Ajout…" : "Ajouter"}
      </button>
    </form>
  );
}

interface Periode {
  anneeDebut: number;
  trimestre: number;
}

export function FormAppreciation({
  eleveId,
  matiere,
  periode,
  texte,
  signature,
  dejaSigne,
  bloque,
}: {
  eleveId: string;
  matiere: string;
  periode: Periode;
  texte: string;
  signature: string | null;
  dejaSigne: boolean;
  bloque: boolean;
}) {
  const [etat, soumettre, enCours] = useSoumission(signerAppreciation, etatInitial);
  return (
    <form onSubmit={soumettre} className="flex flex-col gap-2">
      <input type="hidden" name="eleveId" value={eleveId} />
      <input type="hidden" name="matiere" value={matiere} />
      <input type="hidden" name="anneeDebut" value={periode.anneeDebut} />
      <input type="hidden" name="trimestre" value={periode.trimestre} />
      <textarea
        name="texte"
        defaultValue={texte}
        rows={4}
        maxLength={2000}
        required
        disabled={bloque}
        placeholder="Votre appréciation…"
        className={`${champClass} w-full`}
      />
      <PadSignature nom="signature" initiale={signature} desactive={bloque} />
      <Message etat={etat} />
      {!bloque && (
        <button type="submit" disabled={enCours} className={boutonClass}>
          {enCours ? "Enregistrement…" : dejaSigne ? "Re-signer et enregistrer" : "Signer et enregistrer"}
        </button>
      )}
    </form>
  );
}

export function FormBilan({
  eleveId,
  periode,
  bilan,
  signature,
  dejaSigne,
  bloque,
}: {
  eleveId: string;
  periode: Periode;
  bilan: string;
  signature: string | null;
  dejaSigne: boolean;
  bloque: boolean;
}) {
  const [etat, soumettre, enCours] = useSoumission(signerBilan, etatInitial);
  return (
    <form onSubmit={soumettre} className="flex flex-col gap-2">
      <input type="hidden" name="eleveId" value={eleveId} />
      <input type="hidden" name="anneeDebut" value={periode.anneeDebut} />
      <input type="hidden" name="trimestre" value={periode.trimestre} />
      <textarea
        name="bilan"
        defaultValue={bilan}
        rows={4}
        maxLength={2000}
        disabled={bloque}
        placeholder="Bilan général du trimestre…"
        className={`${champClass} w-full`}
      />
      <PadSignature nom="signature" initiale={signature} desactive={bloque} />
      <Message etat={etat} />
      {!bloque && (
        <button type="submit" disabled={enCours} className={boutonClass}>
          {enCours ? "Enregistrement…" : dejaSigne ? "Re-signer le bilan" : "Signer le bilan"}
        </button>
      )}
    </form>
  );
}

export function BoutonRecompiler({ eleveId, periode }: { eleveId: string; periode: Periode }) {
  const [etat, soumettre, enCours] = useSoumission(recompilerBulletin, etatInitial);
  return (
    <form onSubmit={soumettre} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="eleveId" value={eleveId} />
      <input type="hidden" name="anneeDebut" value={periode.anneeDebut} />
      <input type="hidden" name="trimestre" value={periode.trimestre} />
      <button
        type="submit"
        disabled={enCours}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
      >
        {enCours ? "Mise à jour…" : "Mettre à jour le PDF"}
      </button>
      <Message etat={etat} />
    </form>
  );
}
