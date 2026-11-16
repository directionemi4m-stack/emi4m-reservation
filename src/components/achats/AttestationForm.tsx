"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { enregistrerAttestation, type EtatAction } from "@/app/(app)/admin/achats/occasion/actions";
import { montantEnLettres } from "@/lib/attestationAchat";
import { euros, lireCentimes } from "@/lib/devis";

const champClass =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

export interface ValeursAttestation {
  id?: string;
  date: string;
  vendeurNom: string;
  vendeurAdresse: string;
  vendeurTelephone: string;
  vendeurEmail: string;
  vendeurPiece: string;
  representant: string;
  qualite: string;
  faitA: string;
  modePaiement: string;
  referencePaiement: string;
  banque: string;
  datePaiement: string;
  dateRemise: string;
  demandePar: string;
  motif: string;
  destination: string;
  affectation: string;
  lignes: { designation: string; marqueModele: string; numeroSerie: string; etat: string; prix: string }[];
}

const Champ = ({ label, children, large = false }: { label: string; children: React.ReactNode; large?: boolean }) => (
  <label className={`flex flex-col gap-1 text-xs font-medium text-slate-600 ${large ? "sm:col-span-2" : ""}`}>
    {label}
    {children}
  </label>
);

// Saisie d'une attestation de vente de matériel d'occasion (particulier → EMI4M).
export function AttestationForm({ valeurs, lieux }: { valeurs: ValeursAttestation; lieux: string[] }) {
  const [etat, action, enCours] = useActionState(enregistrerAttestation, { succes: true } as EtatAction);
  const [lignes, setLignes] = useState(() =>
    (valeurs.lignes.length ? valeurs.lignes : [{ designation: "", marqueModele: "", numeroSerie: "", etat: "", prix: "" }]).map((l, i) => ({ ...l, cle: `l${i}` }))
  );
  const [mode, setMode] = useState(valeurs.modePaiement);
  const maj = (cle: string, k: string, v: string) => setLignes((ls) => ls.map((l) => (l.cle === cle ? { ...l, [k]: v } : l)));
  const total = lignes.reduce((s, l) => s + (lireCentimes(l.prix || "0") ?? 0), 0);

  return (
    <form action={action} className="flex flex-col gap-4">
      {valeurs.id && <input type="hidden" name="id" value={valeurs.id} />}
      <section className="grid gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-2">
        <h2 className="text-sm font-semibold text-brand-slate sm:col-span-2">Le vendeur (particulier)</h2>
        <Champ label="Nom, prénom">
          <input name="vendeurNom" required defaultValue={valeurs.vendeurNom} placeholder="DUPONT Jean" className={champClass} />
        </Champ>
        <Champ label="Pièce d'identité (type et n°)">
          <input name="vendeurPiece" defaultValue={valeurs.vendeurPiece} placeholder="Carte d'identité n° …" className={champClass} />
        </Champ>
        <Champ label="Adresse" large>
          <textarea name="vendeurAdresse" rows={2} defaultValue={valeurs.vendeurAdresse} className={champClass} />
        </Champ>
        <Champ label="Téléphone">
          <input name="vendeurTelephone" defaultValue={valeurs.vendeurTelephone} className={champClass} />
        </Champ>
        <Champ label="E-mail">
          <input name="vendeurEmail" type="email" defaultValue={valeurs.vendeurEmail} className={champClass} />
        </Champ>
      </section>

      <section className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-slate">Matériel acheté</h2>
        {lignes.map((l, n) => (
          <div key={l.cle} className="grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-2 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_6rem_auto]">
            <input name="lDesignation" value={l.designation} onChange={(e) => maj(l.cle, "designation", e.target.value)} placeholder="Désignation (ex. Trompette)" aria-label={`Désignation ${n + 1}`} className={`${champClass} col-span-2 min-w-0 sm:col-span-1`} />
            <input name="lMarque" value={l.marqueModele} onChange={(e) => maj(l.cle, "marqueModele", e.target.value)} placeholder="Marque / modèle" aria-label="Marque et modèle" className={`${champClass} min-w-0`} />
            <input name="lSerie" value={l.numeroSerie} onChange={(e) => maj(l.cle, "numeroSerie", e.target.value)} placeholder="N° de série" aria-label="Numéro de série" className={`${champClass} min-w-0`} />
            <input name="lEtat" value={l.etat} onChange={(e) => maj(l.cle, "etat", e.target.value)} placeholder="État" aria-label="État" className={`${champClass} min-w-0`} />
            <input name="lPrix" inputMode="decimal" value={l.prix} onChange={(e) => maj(l.cle, "prix", e.target.value)} placeholder="Prix €" aria-label="Prix en euros" className={`${champClass} min-w-0`} />
            <button type="button" onClick={() => setLignes((ls) => ls.filter((x) => x.cle !== l.cle))} disabled={lignes.length === 1} className="justify-self-end p-2 text-slate-400 hover:text-status-occupee disabled:opacity-30" aria-label={`Retirer la ligne ${n + 1}`}>
              <IconTrash size={16} aria-hidden />
            </button>
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setLignes((ls) => [...ls, { designation: "", marqueModele: "", numeroSerie: "", etat: "", prix: "", cle: `n${Date.now()}` }])}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-accent hover:underline"
          >
            <IconPlus size={14} aria-hidden /> Ajouter un matériel
          </button>
          <p className="text-sm text-slate-600">
            Total : <strong className="text-brand-slate">{euros(total)}</strong>
          </p>
        </div>
        {total > 0 && <p className="text-xs italic text-slate-500">Soit {montantEnLettres(total)}.</p>}
      </section>

      <section className="grid gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-2">
        <h2 className="text-sm font-semibold text-brand-slate sm:col-span-2">Paiement et remise</h2>
        <fieldset className="flex flex-wrap gap-4 text-sm text-slate-700 sm:col-span-2">
          {[
            ["VIREMENT", "Virement"],
            ["CHEQUE", "Chèque"],
            ["ESPECES", "Espèces"],
          ].map(([v, lib]) => (
            <label key={v} className="flex items-center gap-1.5">
              <input type="radio" name="modePaiement" value={v} checked={mode === v} onChange={() => setMode(v)} className="accent-brand-accent" /> {lib}
            </label>
          ))}
        </fieldset>
        {mode !== "ESPECES" && (
          <Champ label={mode === "CHEQUE" ? "N° du chèque" : "Référence du virement"}>
            <input name="referencePaiement" defaultValue={valeurs.referencePaiement} className={champClass} />
          </Champ>
        )}
        {mode === "CHEQUE" && (
          <Champ label="Banque">
            <input name="banque" defaultValue={valeurs.banque} className={champClass} />
          </Champ>
        )}
        <Champ label="Date du paiement">
          <input type="date" name="datePaiement" defaultValue={valeurs.datePaiement} className={champClass} />
        </Champ>
        <Champ label="Date de remise du matériel">
          <input type="date" name="dateRemise" defaultValue={valeurs.dateRemise} className={champClass} />
        </Champ>
      </section>

      <section className="grid gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-2">
        <h2 className="text-sm font-semibold text-brand-slate sm:col-span-2">Signature</h2>
        <Champ label="Date de l'attestation">
          <input type="date" name="date" defaultValue={valeurs.date} className={champClass} />
        </Champ>
        <Champ label="Fait à">
          <input name="faitA" defaultValue={valeurs.faitA} className={champClass} />
        </Champ>
        <Champ label="EMI4M représentée par">
          <input name="representant" defaultValue={valeurs.representant} className={champClass} />
        </Champ>
        <Champ label="En qualité de">
          <input name="qualite" defaultValue={valeurs.qualite} placeholder="Directeur, président(e)…" className={champClass} />
        </Champ>
      </section>

      <section className="grid gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-2">
        <h2 className="text-sm font-semibold text-brand-slate sm:col-span-2">
          Fiche interne de suivi <span className="font-normal text-slate-400">(page 2, facultatif)</span>
        </h2>
        <Champ label="Demandé par">
          <input name="demandePar" defaultValue={valeurs.demandePar} className={champClass} />
        </Champ>
        <Champ label="Discipline / site concerné">
          <input name="affectation" list="lieux-achat" defaultValue={valeurs.affectation} className={champClass} />
          <datalist id="lieux-achat">
            {lieux.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </Champ>
        <Champ label="Motif / usage prévu" large>
          <input name="motif" defaultValue={valeurs.motif} className={champClass} />
        </Champ>
        <fieldset className="flex flex-wrap gap-4 text-sm text-slate-700 sm:col-span-2">
          <span className="text-xs font-medium text-slate-600">Destination :</span>
          {[
            ["ECOLE", "Usage école"],
            ["LOCATION", "Parc de location aux élèves"],
          ].map(([v, lib]) => (
            <label key={v} className="flex items-center gap-1.5">
              <input type="radio" name="destination" value={v} defaultChecked={valeurs.destination === v} className="accent-brand-accent" /> {lib}
            </label>
          ))}
        </fieldset>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enCours} className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60">
          {enCours ? "Enregistrement…" : "Enregistrer l'attestation"}
        </button>
        <Link href={valeurs.id ? `/admin/achats/occasion/${valeurs.id}` : "/admin/achats/occasion"} className="text-sm text-slate-500 hover:underline">
          Annuler
        </Link>
        {etat.message && <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>}
      </div>
    </form>
  );
}
