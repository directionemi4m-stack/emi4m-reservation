"use client";

import { useRef, useState } from "react";
import { IconFileTypePdf } from "@tabler/icons-react";
import { useSoumission } from "@/lib/useSoumission";
import { enregistrerDeclarationSacem, type EtatAction } from "@/app/(app)/admin/sacem/actions";

export interface DeclarationVue {
  id: string;
  passe: boolean;
  aUnProgramme: boolean;
  entreePayante: boolean;
  tarifs: string;
  entrees: string;
  jauge: string;
  recettes: string;
  recettesAnnexes: string;
  depenses: string;
  envoyeeLe: string | null; // « 13/12/2026 »
  url: string | null;
  manquantes: string[];
}

const champClass =
  "rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";
const etatInitial: EtatAction = { succes: true };

// Sous chaque représentation : l'état de la déclaration SACEM et, à déplier, l'entrée, la
// fréquentation, les recettes et les dépenses, avec l'envoi de la déclaration.
export function DeclarationSacem({ d, ouvert = false }: { d: DeclarationVue; ouvert?: boolean }) {
  const [deplie, setDeplie] = useState(ouvert);
  const [payante, setPayante] = useState(d.entreePayante);
  const [etat, soumettre, enCours] = useSoumission(enregistrerDeclarationSacem, etatInitial);
  const envoyer = useRef<HTMLInputElement>(null);

  const statut = d.envoyeeLe
    ? `Déclaration envoyée le ${d.envoyeeLe}`
    : d.passe
      ? d.aUnProgramme
        ? "Déclaration envoyée demain matin"
        : "Pas de déclaration tant que le programme n'est pas saisi"
      : "Déclaration envoyée le lendemain";
  const libelle = (texte: string, enfant: React.ReactNode) => (
    <label className="flex flex-col gap-1 text-xs text-slate-500">
      {texte}
      {enfant}
    </label>
  );

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className={d.envoyeeLe ? "text-status-dispo" : "text-slate-500"}>{statut}</span>
        {d.manquantes.length > 0 && <span className="text-status-attente">À compléter : {d.manquantes.join(", ")}</span>}
        {d.url && (
          <a href={d.url} target="_blank" rel="noreferrer" className="text-brand-accent hover:underline">
            Dans le Drive
          </a>
        )}
        <a href={`/api/sacem?evenement=${d.id}`} target="_blank" rel="noopener" className="flex items-center gap-1 text-brand-accent hover:underline">
          <IconFileTypePdf size={14} aria-hidden /> Aperçu
        </a>
        <button type="button" onClick={() => setDeplie((v) => !v)} className="font-medium text-slate-600 hover:text-brand-slate">
          {deplie ? "Fermer" : "Entrées, recettes, dépenses…"}
        </button>
      </div>

      {deplie && (
        <form onSubmit={soumettre} className="flex flex-col gap-2 rounded-md bg-slate-50 p-3">
          <input type="hidden" name="id" value={d.id} />
          <input ref={envoyer} type="hidden" name="envoyer" value="0" />
          <div className="flex flex-wrap gap-4 text-sm text-slate-700">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="entreePayante" value="0" checked={!payante} onChange={() => setPayante(false)} /> Entrée gratuite
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="entreePayante" value="1" checked={payante} onChange={() => setPayante(true)} /> Entrée payante
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {libelle("Spectateurs", <input name="entrees" inputMode="numeric" defaultValue={d.entrees} className={champClass} />)}
            {libelle("Jauge de la salle", <input name="jauge" inputMode="numeric" defaultValue={d.jauge} className={champClass} />)}
            {payante && libelle("Prix des places", <input name="tarifs" defaultValue={d.tarifs} placeholder="10 € ; 5 € réduit" className={champClass} />)}
            {payante && libelle("Recettes billetterie (€ TTC)", <input name="recettes" inputMode="decimal" defaultValue={d.recettes} className={champClass} />)}
            {libelle("Recettes annexes (€)", <input name="recettesAnnexes" inputMode="decimal" defaultValue={d.recettesAnnexes} placeholder="buvette…" className={champClass} />)}
            {libelle("Budget des dépenses (€)", <input name="depenses" inputMode="decimal" defaultValue={d.depenses} className={champClass} />)}
          </div>
          {etat.message && <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={enCours}
              onClick={() => envoyer.current && (envoyer.current.value = "0")}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Enregistrer
            </button>
            {d.aUnProgramme && (
              <button
                type="submit"
                disabled={enCours}
                onClick={() => envoyer.current && (envoyer.current.value = "1")}
                className="rounded-md bg-brand-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60"
              >
                {enCours ? "Envoi…" : d.envoyeeLe ? "Enregistrer et renvoyer la déclaration" : "Enregistrer et envoyer la déclaration"}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
