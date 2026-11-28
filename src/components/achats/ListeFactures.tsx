"use client";

import { useMemo, useState, useTransition } from "react";
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

// Bloc « Règlement » de chaque facture, toujours au même endroit : l'état (réglée ou à
// régler) et la date du règlement, modifiable directement. « Enregistrer la date »
// n'apparaît que quand la date a changé.
function Reglement({ facture, aujourdHui }: { facture: FactureVue; aujourdHui: string }) {
  const [date, setDate] = useState(facture.payeeLe ?? aujourdHui);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  const reglee = !!facture.payeeLe;

  function envoyer(annuler: boolean) {
    const donnees = new FormData();
    donnees.set("id", facture.id);
    if (annuler) donnees.set("annuler", "1");
    else donnees.set("payeeLe", date);
    demarrer(async () => {
      const r = await marquerFacturePayee(donnees);
      setMessage(r.message ? { ok: r.succes, texte: r.message } : null);
      if (r.succes && annuler) setDate(aujourdHui);
    });
  }

  const teinte = reglee
    ? "border-status-dispo bg-status-dispo/5"
    : facture.enRetard
      ? "border-status-occupee bg-status-occupee/5"
      : "border-status-attente bg-status-attente/5";
  return (
    <div className={`flex flex-col gap-1.5 rounded-md border-l-4 px-3 py-2 ${teinte}`}>
      <p className="text-sm font-semibold">
        {reglee ? (
          <span className="text-emerald-800">✓ Réglée le {dateFr(facture.payeeLe!)}</span>
        ) : (
          <span className={facture.enRetard ? "text-red-800" : "text-amber-800"}>
            À régler
            {facture.enRetard && <span className="font-normal"> · ajoutée il y a plus de 7 jours, rappel envoyé</span>}
          </span>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor={`regle-${facture.id}`} className="text-slate-600">
          {reglee ? "Date du règlement" : "Réglée le"}
        </label>
        <input
          id={`regle-${facture.id}`}
          type="date"
          value={date}
          max={aujourdHui}
          onChange={(e) => {
            setDate(e.target.value);
            setMessage(null);
          }}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
        />
        {reglee ? (
          date !== facture.payeeLe && (
            <button
              type="button"
              disabled={enCours || !date}
              onClick={() => envoyer(false)}
              className="rounded-md bg-brand-accent px-3 py-1 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60"
            >
              {enCours ? "…" : "Enregistrer la date"}
            </button>
          )
        ) : (
          <button
            type="button"
            disabled={enCours || !date}
            onClick={() => envoyer(false)}
            className="rounded-md bg-status-dispo px-3 py-1 text-sm font-semibold text-white hover:bg-status-dispo/90 disabled:opacity-60"
          >
            {enCours ? "…" : "✓ Marquer réglée"}
          </button>
        )}
        {reglee && (
          <button type="button" disabled={enCours} onClick={() => envoyer(true)} className="ml-auto text-xs text-slate-500 underline hover:text-brand-slate">
            Pas encore réglée
          </button>
        )}
      </div>
      {message && <p className={`text-xs ${message.ok ? "text-status-dispo" : "text-status-occupee"}`}>{message.texte}</p>}
    </div>
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
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="text-sm font-semibold text-slate-800">{facture.fournisseur}</span>
        {facture.montantCentimes != null && <span className="ml-auto text-sm font-semibold text-slate-700">{formaterEuros(facture.montantCentimes)}</span>}
      </div>
      <p className="-mt-1.5 text-xs text-slate-500">
        Facture du {dateFr(facture.date)}
        {facture.objet && <span className="text-slate-600"> · {facture.objet}</span>}
        {lies.length > 0 && <span> · Inventaire : {lies.join(", ")}</span>}
      </p>
      <Reglement facture={facture} aujourdHui={aujourdHui} />
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
          {aPayer.length} facture{aPayer.length > 1 ? "s" : ""} à régler · {formaterEuros(aPayer.reduce((s, f) => s + (f.montantCentimes ?? 0), 0))}
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
          <option value="">Réglées et à régler</option>
          <option value="A_PAYER">À régler</option>
          <option value="PAYEE">Réglées</option>
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
