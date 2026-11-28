"use client";

import { useMemo, useState } from "react";
import { IconFileTypePdf } from "@tabler/icons-react";
import { useSoumission } from "@/lib/useSoumission";
import { marquerFacturePayee, modifierFacture, supprimerFacture, type EtatAction } from "@/app/(app)/admin/achats/actions";
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
  payeeLe: string | null; // AAAA-MM-JJ
  enRetard: boolean; // à payer depuis plus de 7 jours : le rappel est parti
  articleIds: string[];
}

function EtatPaiement({ facture }: { facture: FactureVue }) {
  const retard = facture.enRetard;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        facture.payeeLe ? "bg-status-dispo/15 text-emerald-800" : retard ? "bg-status-occupee/15 text-red-800" : "bg-status-attente/15 text-amber-800"
      }`}
    >
      {facture.payeeLe ? `Payée le ${dateFr(facture.payeeLe)}` : retard ? "À payer (rappel envoyé)" : "À payer"}
    </span>
  );
}

// À payer : date du paiement (aujourd'hui par défaut, modifiable) et bouton « Payée ».
// Payée : retour à « à payer » ; la date se corrige dans « Modifier ».
function BoutonPaiement({ facture, aujourdHui }: { facture: FactureVue; aujourdHui: string }) {
  if (facture.payeeLe) {
    return (
      <form action={marquerFacturePayee}>
        <input type="hidden" name="id" value={facture.id} />
        <input type="hidden" name="annuler" value="1" />
        <button type="submit" className="text-xs text-slate-500 hover:text-brand-slate">
          Pas encore payée
        </button>
      </form>
    );
  }
  return (
    <form action={marquerFacturePayee} className="flex items-center gap-1">
      <input type="hidden" name="id" value={facture.id} />
      <label className="sr-only" htmlFor={`paye-${facture.id}`}>
        Date du paiement
      </label>
      <input
        id={`paye-${facture.id}`}
        type="date"
        name="payeeLe"
        required
        defaultValue={aujourdHui}
        max={aujourdHui}
        className="rounded-md border border-slate-300 px-1.5 py-0.5 text-xs"
      />
      <button type="submit" className="rounded-md bg-status-dispo px-2.5 py-1 text-xs font-semibold text-white hover:bg-status-dispo/90">
        ✓ Payée
      </button>
    </form>
  );
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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        {libelle("Objet", <input name="objet" defaultValue={facture.objet ?? ""} className={champClass} />)}
        {libelle("Payée le (vide : à payer)", <input type="date" name="payeeLe" defaultValue={facture.payeeLe ?? ""} className={champClass} />)}
      </div>
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

function LigneFacture({ facture, biens, aujourdHui }: { facture: FactureVue; biens: OptionBien[]; aujourdHui: string }) {
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
        <EtatPaiement facture={facture} />
        {facture.montantCentimes != null && <span className="ml-auto text-sm text-slate-700">{formaterEuros(facture.montantCentimes)}</span>}
      </div>
      {facture.objet && <p className="text-sm text-slate-600">{facture.objet}</p>}
      {lies.length > 0 && <p className="text-xs text-slate-500">Inventaire : {lies.join(", ")}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <BoutonPaiement facture={facture} aujourdHui={aujourdHui} />
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

export function ListeFactures({ factures, biens, aujourdHui }: { factures: FactureVue[]; biens: OptionBien[]; aujourdHui: string }) {
  const annees = [...new Set(factures.map((f) => f.date.slice(0, 4)))].sort().reverse();
  const [annee, setAnnee] = useState(annees[0] ?? "");
  const [recherche, setRecherche] = useState("");
  const [paiement, setPaiement] = useState<"" | "A_PAYER" | "PAYEE">("");
  const aPayer = factures.filter((f) => !f.payeeLe);

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return factures.filter(
      (f) =>
        (!annee || f.date.startsWith(annee)) &&
        (!paiement || (paiement === "PAYEE") === !!f.payeeLe) &&
        (!q || [f.fournisseur, f.objet, f.nomFichier].some((t) => t?.toLowerCase().includes(q)))
    );
  }, [factures, annee, recherche, paiement]);
  const total = visibles.reduce((s, f) => s + (f.montantCentimes ?? 0), 0);

  return (
    <section className="flex flex-col gap-2">
      {aPayer.length > 0 && (
        <button
          type="button"
          onClick={() => setPaiement(paiement === "A_PAYER" ? "" : "A_PAYER")}
          className="w-fit rounded-md bg-status-attente/15 px-3 py-1.5 text-left text-sm text-amber-900 hover:bg-status-attente/25"
        >
          {aPayer.length} facture{aPayer.length > 1 ? "s" : ""} à payer · {formaterEuros(aPayer.reduce((s, f) => s + (f.montantCentimes ?? 0), 0))}
          {paiement !== "A_PAYER" && <span className="ml-2 text-xs underline">Voir</span>}
        </button>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_auto_1fr]">
        <select value={annee} onChange={(e) => setAnnee(e.target.value)} className={`${champClass} py-1.5`}>
          <option value="">Toutes les années</option>
          {annees.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select value={paiement} onChange={(e) => setPaiement(e.target.value as typeof paiement)} className={`${champClass} py-1.5`}>
          <option value="">Payées et à payer</option>
          <option value="A_PAYER">À payer</option>
          <option value="PAYEE">Payées</option>
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
            <LigneFacture key={f.id} facture={f} biens={biens} aujourdHui={aujourdHui} />
          ))}
        </ul>
      )}
    </section>
  );
}
