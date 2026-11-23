"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { IconExternalLink } from "@tabler/icons-react";
import {
  enregistrerProposition,
  retenirProposition,
  retirerDemandeMateriel,
  supprimerProposition,
  traiterDemandeMateriel,
  type EtatAction,
} from "@/app/(app)/materiel/actions";
import { FormDemandeMateriel } from "@/components/materiel/FormDemandeMateriel";
import { euros } from "@/lib/devis";
import {
  coutDemande,
  INFOS_STATUT,
  INFOS_URGENCE,
  LIBELLE_MAX,
  nomSite,
  REPONSE_MAX,
  STATUTS,
  URL_MAX,
  type StatutDemande,
  type Urgence,
} from "@/lib/demandesMateriel";

const champ = "min-w-0 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";
const jour = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" });
const prixSaisie = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2).replace(".", ",").replace(",00", ""));
// Envoi sans remise à zéro automatique : la saisie reste en place si le serveur la refuse.
const envoyerSans = (action: (fd: FormData) => void) => (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  startTransition(() => action(fd));
};

export interface Proposition {
  id: string;
  libelle: string | null;
  url: string | null;
  prixCentimes: number | null;
  retenue: boolean;
}
export interface DemandeAffichee {
  id: string;
  titre: string;
  quantite: number;
  details: string | null;
  urgence: Urgence;
  statut: StatutDemande;
  reponse: string | null;
  creeLe: Date;
  auteur: string | null;
  propositions: Proposition[];
}

function FormProposition({ demandeId, p, surFin }: { demandeId: string; p?: Proposition; surFin: () => void }) {
  const [etat, action, enCours] = useActionState(async (avant: EtatAction, fd: FormData) => {
    const r = await enregistrerProposition(avant, fd);
    if (r.succes) surFin();
    return r;
  }, { succes: true } as EtatAction);
  return (
    <form onSubmit={envoyerSans(action)} className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2 rounded-md bg-slate-50 p-2">
      <input type="hidden" name="demandeId" value={demandeId} />
      {p && <input type="hidden" name="id" value={p.id} />}
      <input name="lien" inputMode="url" maxLength={URL_MAX} defaultValue={p?.url ?? ""} placeholder="Lien vers le site" aria-label="Lien vers le site" className={champ} />
      <input name="prix" inputMode="decimal" defaultValue={prixSaisie(p?.prixCentimes ?? null)} placeholder="Prix €" aria-label="Prix unitaire en euros" className={champ} />
      <input name="libelle" maxLength={LIBELLE_MAX} defaultValue={p?.libelle ?? ""} placeholder="Précision (modèle, port compris…)" aria-label="Précision" className={`${champ} col-span-2`} />
      <div className="col-span-2 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enCours} className="rounded-md bg-brand-accent px-3 py-1 text-xs font-semibold text-white disabled:opacity-60">
          {enCours ? "…" : "Enregistrer"}
        </button>
        <button type="button" onClick={surFin} className="text-xs text-slate-500 hover:underline">
          Annuler
        </button>
        {etat.message && !etat.succes && <span className="text-xs text-status-occupee">{etat.message}</span>}
      </div>
    </form>
  );
}

function LigneProposition({ d, p, peutModifier, direction }: { d: DemandeAffichee; p: Proposition; peutModifier: boolean; direction: boolean }) {
  const [edition, setEdition] = useState(false);
  if (edition) return <FormProposition demandeId={d.id} p={p} surFin={() => setEdition(false)} />;
  return (
    <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border p-2 text-sm ${p.retenue ? "border-emerald-400 bg-emerald-50" : "border-slate-200"}`}>
      <div className="min-w-0">
        {p.url ? (
          <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-medium text-brand-accent hover:underline">
            <IconExternalLink size={14} aria-hidden /> {nomSite(p.url)}
          </a>
        ) : (
          <span className="font-medium text-slate-700">{p.libelle ?? "Proposition"}</span>
        )}
        {p.url && p.libelle && <span className="block text-xs text-slate-500">{p.libelle}</span>}
        {p.retenue && <span className="block text-xs font-semibold text-emerald-800">✓ Retenue</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {p.prixCentimes !== null && (
          <span className="text-right tabular-nums">
            <strong className="text-slate-800">{euros(p.prixCentimes)}</strong>
            {d.quantite > 1 && <span className="block text-xs text-slate-500">× {d.quantite} = {euros(p.prixCentimes * d.quantite)}</span>}
          </span>
        )}
        {direction && (
          <form action={retenirProposition}>
            <input type="hidden" name="id" value={p.id} />
            <button type="submit" className="text-xs font-medium text-emerald-700 hover:underline">
              {p.retenue ? "Ne plus retenir" : "Retenir"}
            </button>
          </form>
        )}
        {peutModifier && (
          <>
            <button type="button" onClick={() => setEdition(true)} className="text-xs text-brand-accent hover:underline">
              Modifier
            </button>
            <form action={supprimerProposition}>
              <input type="hidden" name="id" value={p.id} />
              <button type="submit" className="text-xs text-slate-400 hover:text-status-occupee">
                Retirer
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Traitement({ d }: { d: DemandeAffichee }) {
  const [etat, action, enCours] = useActionState(traiterDemandeMateriel, { succes: true } as EtatAction);
  return (
    <form onSubmit={envoyerSans(action)} className="flex flex-col gap-2 rounded-md bg-slate-50 p-2.5">
      <input type="hidden" name="id" value={d.id} />
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {STATUTS.map((s) => (
          <label key={s} className="flex items-center gap-1 text-xs text-slate-700">
            <input type="radio" name="statut" value={s} defaultChecked={d.statut === s} className="accent-brand-accent" /> {INFOS_STATUT[s].libelle}
          </label>
        ))}
      </div>
      <textarea name="reponse" rows={2} maxLength={REPONSE_MAX} defaultValue={d.reponse ?? ""} placeholder="Votre réponse au prof (facultatif)" className={champ} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enCours} className="rounded-md bg-brand-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
          {enCours ? "…" : "Enregistrer"}
        </button>
        {d.auteur && (
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input type="checkbox" name="prevenir" defaultChecked className="h-3.5 w-3.5 accent-brand-accent" /> Prévenir le prof
          </label>
        )}
        {etat.message && <span className={`text-xs ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</span>}
      </div>
    </form>
  );
}

// Une demande : urgence, statut, propositions avec liens et prix, réponse de la direction.
export function CarteDemandeMateriel({ demande: d, peutModifier, direction = false }: { demande: DemandeAffichee; peutModifier: boolean; direction?: boolean }) {
  const [edition, setEdition] = useState(false);
  const [ajout, setAjout] = useState(false);
  const cout = coutDemande(d.quantite, d.propositions);

  if (edition) {
    return (
      <article className="rounded-lg bg-white p-4 shadow-sm">
        <FormDemandeMateriel
          valeurs={{ id: d.id, titre: d.titre, quantite: d.quantite, urgence: d.urgence, details: d.details ?? "" }}
          surFin={() => setEdition(false)}
        />
      </article>
    );
  }
  return (
    <article className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-800">
            {d.titre}
            {d.quantite > 1 && <span className="font-normal text-slate-500"> × {d.quantite}</span>}
          </h3>
          <p className="text-xs text-slate-500">{[direction ? (d.auteur ?? "Compte supprimé") : null, jour(d.creeLe)].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${INFOS_URGENCE[d.urgence].classe}`}>{INFOS_URGENCE[d.urgence].libelle}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${INFOS_STATUT[d.statut].classe}`}>{INFOS_STATUT[d.statut].libelle}</span>
        </div>
      </div>
      {d.details && <p className="whitespace-pre-line text-sm text-slate-700">{d.details}</p>}

      {d.propositions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {d.propositions.map((p) => (
            <LigneProposition key={p.id} d={d} p={p} peutModifier={peutModifier} direction={direction} />
          ))}
        </div>
      )}
      {cout && (
        <p className="text-xs text-slate-600">
          {cout.retenue ? "Coût retenu" : "Estimation (la moins chère)"} : <strong className="tabular-nums text-slate-800">{euros(cout.centimes)}</strong>
        </p>
      )}
      {ajout && <FormProposition demandeId={d.id} surFin={() => setAjout(false)} />}

      {d.reponse && !direction && (
        <p className="whitespace-pre-line rounded-md bg-brand-accent/5 p-2 text-sm text-slate-700">
          <span className="font-medium text-brand-slate">La direction : </span>
          {d.reponse}
        </p>
      )}
      {direction && <Traitement d={d} />}

      {peutModifier && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {!ajout && (
            <button type="button" onClick={() => setAjout(true)} className="font-medium text-brand-accent hover:underline">
              + Lien ou prix
            </button>
          )}
          <button type="button" onClick={() => setEdition(true)} className="text-brand-accent hover:underline">
            Modifier la demande
          </button>
          <form action={retirerDemandeMateriel}>
            <input type="hidden" name="id" value={d.id} />
            <button type="submit" className="text-slate-400 hover:text-status-occupee">
              Supprimer
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
