"use client";

import { useMemo, useState } from "react";
import { IconFileTypePdf } from "@tabler/icons-react";
import { useSoumission } from "@/lib/useSoumission";
import { modifierFacture, supprimerFacture, type EtatAction } from "@/app/(app)/admin/achats/actions";
import { formaterEuros } from "@/lib/inventaire";
import { ChoixBiens, type OptionBien } from "@/components/achats/AjoutFacture";

export interface FactureVue {
  id: string;
  date: string; // AAAA-MM-JJ
  fournisseur: string;
  montantCentimes: number | null;
  objet: string | null;
  nomFichier: string;
  url: string;
  articleIds: string[];
}

const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";
const etatInitial: EtatAction = { succes: true };
const dateFr = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC" });

function FormModification({ facture, biens, onFini }: { facture: FactureVue; biens: OptionBien[]; onFini: () => void }) {
  const [etat, soumettre, enCours] = useSoumission(modifierFacture, etatInitial);
  const [articleIds, setArticleIds] = useState(facture.articleIds);
  const libelle = (texte: string, enfant: React.ReactNode) => (
    <label className="flex flex-col gap-1 text-xs text-slate-500">
      {texte}
      {enfant}
    </label>
  );
  return (
    <form
      onSubmit={(e) => {
        soumettre(e);
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="id" value={facture.id} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {libelle("Date", <input type="date" name="date" required defaultValue={facture.date} className={champClass} />)}
        {libelle("Entreprise", <input name="fournisseur" required defaultValue={facture.fournisseur} className={champClass} />)}
        {libelle(
          "Montant TTC (€)",
          <input
            name="montant"
            inputMode="decimal"
            defaultValue={facture.montantCentimes != null ? (facture.montantCentimes / 100).toFixed(2).replace(".", ",") : ""}
            className={champClass}
          />
        )}
      </div>
      {libelle("Objet", <input name="objet" defaultValue={facture.objet ?? ""} className={champClass} />)}
      <ChoixBiens biens={biens} choisis={articleIds} onChange={setArticleIds} />
      {libelle("Nom du fichier", <input name="nomFichier" defaultValue={facture.nomFichier} className={`${champClass} font-mono text-xs`} />)}
      {etat.message && <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={enCours} className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60">
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button type="button" onClick={onFini} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
          Fermer
        </button>
      </div>
    </form>
  );
}

function LigneFacture({ facture, biens }: { facture: FactureVue; biens: OptionBien[] }) {
  const [edition, setEdition] = useState(false);
  if (edition) {
    return (
      <li className="p-4">
        <FormModification facture={facture} biens={biens} onFini={() => setEdition(false)} />
      </li>
    );
  }
  const lies = facture.articleIds.map((id) => biens.find((b) => b.id === id)?.libelle).filter(Boolean);
  return (
    <li className="flex flex-col gap-1 px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="text-sm font-semibold text-slate-800">{facture.fournisseur}</span>
        <span className="text-xs text-slate-500">{dateFr(facture.date)}</span>
        {facture.montantCentimes != null && <span className="ml-auto text-sm text-slate-700">{formaterEuros(facture.montantCentimes)}</span>}
      </div>
      {facture.objet && <p className="text-sm text-slate-600">{facture.objet}</p>}
      {lies.length > 0 && <p className="text-xs text-slate-500">Inventaire : {lies.join(", ")}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <a href={facture.url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-1 text-xs text-brand-accent hover:underline">
          <IconFileTypePdf size={14} aria-hidden />
          <span className="truncate font-mono">{facture.nomFichier}</span>
        </a>
        <button type="button" onClick={() => setEdition(true)} className="text-xs font-medium text-slate-600 hover:text-brand-slate">
          Modifier / renommer
        </button>
        <form
          action={supprimerFacture}
          onSubmit={(e) => {
            if (!window.confirm(`Supprimer la facture ${facture.nomFichier} ? Elle part dans la corbeille du Drive (récupérable 30 jours).`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={facture.id} />
          <button type="submit" className="text-xs text-slate-400 hover:text-status-occupee">
            Supprimer
          </button>
        </form>
      </div>
    </li>
  );
}

export function ListeFactures({ factures, biens }: { factures: FactureVue[]; biens: OptionBien[] }) {
  const annees = [...new Set(factures.map((f) => f.date.slice(0, 4)))].sort().reverse();
  const [annee, setAnnee] = useState(annees[0] ?? "");
  const [recherche, setRecherche] = useState("");

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return factures.filter(
      (f) =>
        (!annee || f.date.startsWith(annee)) &&
        (!q || [f.fournisseur, f.objet, f.nomFichier].some((t) => t?.toLowerCase().includes(q)))
    );
  }, [factures, annee, recherche]);
  const total = visibles.reduce((s, f) => s + (f.montantCentimes ?? 0), 0);

  return (
    <section className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr]">
        <select value={annee} onChange={(e) => setAnnee(e.target.value)} className={`${champClass} py-1.5`}>
          <option value="">Toutes les années</option>
          {annees.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher une entreprise, un objet…"
          className={`${champClass} py-1.5`}
        />
      </div>
      <p className="text-xs text-slate-500">
        {visibles.length} facture{visibles.length > 1 ? "s" : ""} · {formaterEuros(total)}
      </p>
      {visibles.length === 0 ? (
        <p className="rounded-lg bg-white p-4 text-sm text-slate-500 shadow-sm">Aucune facture.</p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg bg-white shadow-sm">
          {visibles.map((f) => (
            <LigneFacture key={f.id} facture={f} biens={biens} />
          ))}
        </ul>
      )}
    </section>
  );
}
