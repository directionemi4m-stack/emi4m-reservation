"use client";

import { useState } from "react";
import { IconKey, IconMinus, IconPlus } from "@tabler/icons-react";
import { useSoumission } from "@/lib/useSoumission";
import { mettreAJourRegistre, remettreCles, restituerCles, supprimerRemise, type EtatAction } from "@/app/(app)/admin/cles/actions";
import { ACCES, type Quantites } from "@/lib/cles";
import { PadSignature } from "@/components/bulletins/PadSignature";

const etatInitial: EtatAction = { succes: true };
const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";
const boutonPrincipal =
  "w-fit rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60";
const boutonSecondaire = "rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50";

const aujourdHui = () => new Date().toLocaleDateString("fr-CA");
const dateFr = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC" });

export interface RemiseVue {
  id: string;
  resume: string; // « 1 clé Villard · 1 badge Lans »
  remiseLe: string; // AAAA-MM-JJ
  remiseSignee: boolean; // false : reprise du registre papier
  restitueLe: string | null;
  restitutionSignee: boolean;
}

export interface SalarieVue {
  id: string;
  prenom: string;
  nom: string;
  detient: string; // résumé de ce qu'il a encore, ou ""
  remises: RemiseVue[];
}

function Message({ etat }: { etat: EtatAction }) {
  if (!etat.message) return null;
  return <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>;
}

// Signature du salarié sur le téléphone de la direction, ou mention « déjà signé sur le
// registre papier » pour reprendre les remises antérieures à l'appli.
function Signature({ prenom, maSignature }: { prenom: string; maSignature: string | null }) {
  const [papier, setPapier] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      {!papier && (
        <>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-brand-slate">Signature de {prenom}</p>
            <PadSignature nom="signature" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-brand-slate">Votre signature (direction)</p>
            {maSignature && <p className="text-xs text-slate-400">Votre dernière signature est reprise : effacez-la pour re-signer.</p>}
            <PadSignature nom="signatureDirection" initiale={maSignature} />
          </div>
        </>
      )}
      <label className="flex items-center gap-2 text-xs text-slate-500">
        <input type="checkbox" name="papier" checked={papier} onChange={(e) => setPapier(e.target.checked)} className="accent-brand-accent" />
        Déjà signé sur le registre papier
      </label>
    </div>
  );
}

function Compteur({ nom, libelle, detail }: { nom: string; libelle: string; detail: string }) {
  const [n, setN] = useState(0);
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 shadow-sm">
      <div>
        <p className="text-sm font-medium text-slate-700">{libelle}</p>
        <p className="text-xs text-slate-400">{detail}</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setN((v) => Math.max(0, v - 1))} className="rounded-full bg-slate-100 p-1.5 text-slate-600" aria-label="Moins">
          <IconMinus size={16} aria-hidden />
        </button>
        <span className={`w-6 text-center text-lg font-semibold ${n ? "text-brand-slate" : "text-slate-300"}`}>{n}</span>
        <button type="button" onClick={() => setN((v) => Math.min(20, v + 1))} className="rounded-full bg-slate-100 p-1.5 text-slate-600" aria-label="Plus">
          <IconPlus size={16} aria-hidden />
        </button>
        <input type="hidden" name={nom} value={n} />
      </div>
    </div>
  );
}

function FormRemise({ salarie, maSignature, onFini }: { salarie: SalarieVue; maSignature: string | null; onFini: () => void }) {
  const [etat, soumettre, enCours] = useSoumission(remettreCles, etatInitial);
  if (etat.succes && etat.message) {
    return (
      <div className="flex flex-col gap-2">
        <Message etat={etat} />
        <button type="button" onClick={onFini} className={boutonSecondaire}>
          Fermer
        </button>
      </div>
    );
  }
  return (
    <form onSubmit={soumettre} className="flex flex-col gap-3 rounded-md bg-slate-50 p-3">
      <input type="hidden" name="profId" value={salarie.id} />
      {ACCES.map((a) => (
        <Compteur key={a.champ} nom={a.champ} libelle={a.long} detail={a.detail} />
      ))}
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        Date de remise
        <input type="date" name="date" required defaultValue={aujourdHui()} className={champClass} />
      </label>
      <Signature prenom={salarie.prenom} maSignature={maSignature} />
      <Message etat={etat} />
      <div className="flex gap-2">
        <button type="submit" disabled={enCours} className={boutonPrincipal}>
          {enCours ? "Enregistrement…" : "Enregistrer la remise"}
        </button>
        <button type="button" onClick={onFini} className={boutonSecondaire}>
          Annuler
        </button>
      </div>
    </form>
  );
}

function FormRestitution({ salarie, maSignature, onFini }: { salarie: SalarieVue; maSignature: string | null; onFini: () => void }) {
  const [etat, soumettre, enCours] = useSoumission(restituerCles, etatInitial);
  const ouvertes = salarie.remises.filter((r) => !r.restitueLe);
  if (etat.succes && etat.message) {
    return (
      <div className="flex flex-col gap-2">
        <Message etat={etat} />
        <button type="button" onClick={onFini} className={boutonSecondaire}>
          Fermer
        </button>
      </div>
    );
  }
  return (
    <form onSubmit={soumettre} className="flex flex-col gap-3 rounded-md bg-slate-50 p-3">
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-xs text-slate-500">Ce qui est rendu</legend>
        {ouvertes.map((r) => (
          <label key={r.id} className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="remiseIds" value={r.id} defaultChecked className="h-4 w-4 accent-brand-accent" />
            {r.resume} <span className="text-xs text-slate-400">(remis le {dateFr(r.remiseLe)})</span>
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        Date de restitution
        <input type="date" name="date" required defaultValue={aujourdHui()} className={champClass} />
      </label>
      <Signature prenom={salarie.prenom} maSignature={maSignature} />
      <Message etat={etat} />
      <div className="flex gap-2">
        <button type="submit" disabled={enCours} className={boutonPrincipal}>
          {enCours ? "Enregistrement…" : "Enregistrer la restitution"}
        </button>
        <button type="button" onClick={onFini} className={boutonSecondaire}>
          Annuler
        </button>
      </div>
    </form>
  );
}

export function CarteSalarie({ salarie, maSignature }: { salarie: SalarieVue; maSignature: string | null }) {
  const [mode, setMode] = useState<"remise" | "restitution" | null>(null);
  const [historique, setHistorique] = useState(false);
  const ouvertes = salarie.remises.filter((r) => !r.restitueLe);

  return (
    <li className="flex flex-col gap-2 rounded-lg bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`rounded-full p-1.5 ${salarie.detient ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"}`}>
          <IconKey size={16} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">
            {salarie.prenom} {salarie.nom}
          </p>
          <p className="text-xs text-slate-500">{salarie.detient || "Aucune clé ni badge"}</p>
        </div>
        {mode === null && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode("remise")} className={boutonSecondaire}>
              Remettre
            </button>
            {ouvertes.length > 0 && (
              <button type="button" onClick={() => setMode("restitution")} className={boutonSecondaire}>
                Restitution
              </button>
            )}
          </div>
        )}
      </div>

      {mode === "remise" && <FormRemise salarie={salarie} maSignature={maSignature} onFini={() => setMode(null)} />}
      {mode === "restitution" && <FormRestitution salarie={salarie} maSignature={maSignature} onFini={() => setMode(null)} />}

      {salarie.remises.length > 0 && mode === null && (
        <button type="button" onClick={() => setHistorique((v) => !v)} className="w-fit text-xs text-slate-500 underline">
          {historique ? "Masquer l'historique" : `Historique (${salarie.remises.length})`}
        </button>
      )}
      {historique && mode === null && (
        <ul className="flex flex-col gap-1 border-l-2 border-slate-100 pl-3">
          {salarie.remises.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-2 text-xs text-slate-600">
              <span className="font-medium">{r.resume}</span>
              <span>
                remis le {dateFr(r.remiseLe)}
                {r.remiseSignee ? " (signé)" : " (registre papier)"}
              </span>
              <span>
                {r.restitueLe
                  ? `· rendu le ${dateFr(r.restitueLe)}${r.restitutionSignee ? " (signé)" : " (registre papier)"}`
                  : "· pas encore rendu"}
              </span>
              <form
                action={supprimerRemise}
                onSubmit={(e) => {
                  if (!window.confirm("Supprimer cette ligne du registre ? (À réserver aux erreurs de saisie.)")) e.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={r.id} />
                <button type="submit" className="text-slate-400 hover:text-status-occupee">
                  Supprimer
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function BoutonRegistre({ anneeDebut }: { anneeDebut: number }) {
  const [etat, soumettre, enCours] = useSoumission(mettreAJourRegistre, etatInitial);
  return (
    <form onSubmit={soumettre} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="anneeDebut" value={anneeDebut} />
      <button type="submit" disabled={enCours} className={boutonSecondaire}>
        {enCours ? "Mise à jour…" : "Mettre à jour le registre PDF"}
      </button>
      <Message etat={etat} />
    </form>
  );
}

export type { Quantites };
