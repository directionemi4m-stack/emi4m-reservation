"use client";

import { enregistrerCalendrierBulletins, type EtatAction } from "@/app/(app)/bulletins-cham/actions";
import { useSoumission } from "@/lib/useSoumission";

const etatInitial: EtatAction = { succes: true };
const TITRES: Record<number, string> = { 1: "1er trimestre", 2: "2e trimestre", 3: "3e trimestre" };

export interface LigneCalendrier {
  trimestre: number;
  ouverture: string; // AAAA-MM-JJ
  relance: string;
  ouvertureEnvoyee: string | null; // texte déjà formaté : « 15 novembre 2026 à 08:53 »
  relanceEnvoyee: string | null;
}

function Rappel({ nom, libelle, valeur, envoye, demain, aujourdHui }: { nom: string; libelle: string; valeur: string; envoye: string | null; demain: string; aujourdHui: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-600">
      {libelle}
      {envoye ? (
        <span className="rounded-md bg-emerald-50 px-2 py-2 text-sm font-normal text-emerald-800">✓ Envoyé le {envoye}</span>
      ) : (
        <>
          <input
            type="date"
            name={nom}
            defaultValue={valeur}
            min={valeur < demain ? undefined : demain}
            required
            className="w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
          />
          {valeur <= aujourdHui && <span className="font-normal text-status-occupee">Date passée, pas envoyé : choisissez une nouvelle date</span>}
        </>
      )}
    </label>
  );
}

// Calendrier des rappels aux profs : ce qui est parti, ce qui est prévu, et les dates à venir
// modifiables. Un rappel déjà envoyé reste affiché tel quel.
export function CalendrierRappels({
  anneeDebut,
  lignes,
  dernier,
  demain,
  aujourdHui,
  bloque,
}: {
  anneeDebut: number;
  lignes: LigneCalendrier[];
  dernier: string | null;
  demain: string;
  aujourdHui: string;
  bloque: boolean;
}) {
  const [etat, soumettre, enCours] = useSoumission(enregistrerCalendrierBulletins, etatInitial);
  const modifiable = lignes.some((l) => !l.ouvertureEnvoyee || !l.relanceEnvoyee);

  return (
    <section id="rappels-profs" className="flex scroll-mt-4 flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-brand-slate">
          Rappels aux profs — {anneeDebut}-{anneeDebut + 1}
        </h2>
        <p className="text-xs text-slate-500">
          {dernier ? `Dernier rappel envoyé le ${dernier}. ` : "Aucun rappel envoyé cette année. "}
          L&apos;annonce part à tous les profs, la relance seulement à ceux qui n&apos;ont pas fini, par mail et notification, le matin de la date prévue.
        </p>
      </div>
      <form onSubmit={soumettre} className="flex flex-col gap-3">
        <input type="hidden" name="anneeDebut" value={anneeDebut} />
        {lignes.map((l) => (
          <fieldset key={l.trimestre} className="grid gap-2 rounded-md bg-slate-50 p-3 sm:grid-cols-2">
            <legend className="px-1 text-sm font-semibold text-brand-slate">{TITRES[l.trimestre]}</legend>
            <Rappel nom={`ouverture${l.trimestre}`} libelle="Annonce (ouverture des bulletins)" valeur={l.ouverture} envoye={l.ouvertureEnvoyee} demain={demain} aujourdHui={aujourdHui} />
            <Rappel nom={`relance${l.trimestre}`} libelle="Relance" valeur={l.relance} envoye={l.relanceEnvoyee} demain={demain} aujourdHui={aujourdHui} />
          </fieldset>
        ))}
        {modifiable && !bloque && (
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={enCours} className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60">
              {enCours ? "Enregistrement…" : "Enregistrer les dates"}
            </button>
            {etat.message && <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>}
          </div>
        )}
      </form>
    </section>
  );
}
