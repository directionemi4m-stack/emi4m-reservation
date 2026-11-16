"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { importerAttestationPapier, type EtatAction } from "@/app/(app)/admin/achats/occasion/actions";
import { ChoixScan } from "@/components/achats/ChoixScan";
import { euros, lireCentimes } from "@/lib/devis";

const champClass =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";
const vide = () => ({ designation: "", marqueModele: "", numeroSerie: "", prix: "" });

// Attestation déjà signée sur papier : quelques champs pour la retrouver et l'inventaire,
// puis le PDF ou les photos.
export function ImportAttestationPapier({ jour }: { jour: string }) {
  const [etat, action, enCours] = useActionState(importerAttestationPapier, { succes: true } as EtatAction);
  const [lignes, setLignes] = useState(() => [{ ...vide(), cle: "l0" }]);
  const maj = (cle: string, k: string, v: string) => setLignes((ls) => ls.map((l) => (l.cle === cle ? { ...l, [k]: v } : l)));
  const total = lignes.reduce((s, l) => s + (lireCentimes(l.prix || "0") ?? 0), 0);

  return (
    <form action={action} className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-slate">1. L&apos;attestation papier signée</h2>
        <ChoixScan libelle="PDF, ou photo de chaque page" />
        <ChoixScan nom="piece" libelle="Copie de la pièce d'identité du vendeur (facultatif)" />
      </section>

      <section className="grid gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-2">
        <h2 className="text-sm font-semibold text-brand-slate sm:col-span-2">2. Pour la retrouver</h2>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Vendeur (nom, prénom)
          <input name="vendeurNom" required placeholder="DUPONT Jean" className={champClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Date de l&apos;attestation
          <input type="date" name="date" defaultValue={jour} className={champClass} />
        </label>
        <fieldset className="flex flex-wrap gap-4 text-sm text-slate-700 sm:col-span-2">
          <span className="text-xs font-medium text-slate-600">Payé par :</span>
          {[
            ["VIREMENT", "Virement"],
            ["CHEQUE", "Chèque"],
            ["ESPECES", "Espèces"],
          ].map(([v, lib]) => (
            <label key={v} className="flex items-center gap-1.5">
              <input type="radio" name="modePaiement" value={v} className="accent-brand-accent" /> {lib}
            </label>
          ))}
        </fieldset>
      </section>

      <section className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-slate">3. Matériel acheté</h2>
        {lignes.map((l, n) => (
          <div key={l.cle} className="grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-2 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1.3fr)_minmax(0,1fr)_6rem_auto]">
            <input name="lDesignation" value={l.designation} onChange={(e) => maj(l.cle, "designation", e.target.value)} placeholder="Désignation (ex. Trompette)" aria-label={`Désignation ${n + 1}`} className={`${champClass} col-span-2 min-w-0 sm:col-span-1`} />
            <input name="lMarque" value={l.marqueModele} onChange={(e) => maj(l.cle, "marqueModele", e.target.value)} placeholder="Marque / modèle" aria-label="Marque et modèle" className={`${champClass} min-w-0`} />
            <input name="lSerie" value={l.numeroSerie} onChange={(e) => maj(l.cle, "numeroSerie", e.target.value)} placeholder="N° de série" aria-label="Numéro de série" className={`${champClass} min-w-0`} />
            <input name="lPrix" inputMode="decimal" value={l.prix} onChange={(e) => maj(l.cle, "prix", e.target.value)} placeholder="Prix €" aria-label="Prix en euros" className={`${champClass} min-w-0`} />
            <button type="button" onClick={() => setLignes((ls) => ls.filter((x) => x.cle !== l.cle))} disabled={lignes.length === 1} className="justify-self-end p-2 text-slate-400 hover:text-status-occupee disabled:opacity-30" aria-label={`Retirer la ligne ${n + 1}`}>
              <IconTrash size={16} aria-hidden />
            </button>
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => setLignes((ls) => [...ls, { ...vide(), cle: `n${ls.length}-${Math.random()}` }])} className="inline-flex items-center gap-1 text-xs font-medium text-brand-accent hover:underline">
            <IconPlus size={14} aria-hidden /> Ajouter un matériel
          </button>
          <p className="text-sm text-slate-600">
            Total : <strong className="text-brand-slate">{euros(total)}</strong>
          </p>
        </div>
        <label className="mt-1 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="inventaire" defaultChecked className="h-4 w-4 accent-brand-accent" />
          Ajouter le matériel à l&apos;inventaire
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enCours} className="rounded-md bg-brand-accent px-5 py-3 text-base font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60">
          {enCours ? "Archivage…" : "Archiver l'attestation"}
        </button>
        <Link href="/admin/achats/occasion" className="text-sm text-slate-500 hover:underline">
          Annuler
        </Link>
        {etat.message && !etat.succes && <p className="text-sm text-status-occupee">{etat.message}</p>}
      </div>
    </form>
  );
}
