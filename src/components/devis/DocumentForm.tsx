"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { emettreFacture, enregistrerDevis, type EtatAction } from "@/app/(app)/admin/devis/actions";
import { euros, lireCentimes, lireNombre, totalLigne } from "@/lib/devis";

const champClass =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

export interface Rubrique {
  id: string;
  libelle: string;
  description: string | null;
  unite: string | null;
  prixUnitaireCentimes: number | null;
}
export interface Client {
  nom: string;
  adresse: string | null;
  email: string | null;
}
interface LigneSaisie {
  cle: string;
  designation: string;
  quantite: string;
  unite: string;
  prix: string;
}
export interface ValeursDocument {
  id?: string;
  devisId?: string;
  clientNom: string;
  clientAdresse: string;
  clientEmail: string;
  objet: string;
  datePrestation: string;
  date: string; // AAAA-MM-JJ : date du devis ou de la facture
  echeance: string; // validité du devis ou échéance de la facture
  conditions: string;
  notes?: string;
  lignes: { designation: string; quantite: number; unite: string | null; prixUnitaireCentimes: number }[];
}

const prixTexte = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ",").replace(",00", ""));

// Formulaire d'un devis (création, modification du brouillon) ou d'une facture (émission).
export function DocumentForm({
  type,
  valeurs,
  rubriques,
  clients,
  conditionsParDefaut,
  annuler,
}: {
  type: "DEVIS" | "FACTURE";
  valeurs: ValeursDocument;
  rubriques: Rubrique[];
  clients: Client[];
  conditionsParDefaut: string;
  annuler: string;
}) {
  const estDevis = type === "DEVIS";
  const [etat, action, enCours] = useActionState(estDevis ? enregistrerDevis : emettreFacture, { succes: true } as EtatAction);
  const [adresse, setAdresse] = useState(valeurs.clientAdresse);
  const [email, setEmail] = useState(valeurs.clientEmail);
  const [lignes, setLignes] = useState<LigneSaisie[]>(() =>
    (valeurs.lignes.length ? valeurs.lignes : [{ designation: "", quantite: 1, unite: null, prixUnitaireCentimes: 0 }]).map((l, i) => ({
      cle: `l${i}`,
      designation: l.designation,
      quantite: String(l.quantite).replace(".", ","),
      unite: l.unite ?? "",
      prix: prixTexte(valeurs.lignes.length ? l.prixUnitaireCentimes : null),
    }))
  );
  const maj = (cle: string, champ: keyof LigneSaisie, v: string) => setLignes((ls) => ls.map((l) => (l.cle === cle ? { ...l, [champ]: v } : l)));
  const ajouter = (r?: Rubrique) =>
    setLignes((ls) => {
      const nouvelle = {
        cle: `n${Date.now()}-${ls.length}`,
        designation: r ? (r.description ? `${r.libelle} — ${r.description}` : r.libelle) : "",
        quantite: "1",
        unite: r?.unite ?? "",
        prix: prixTexte(r?.prixUnitaireCentimes ?? null),
      };
      // Une seule ligne encore vide : elle est remplacée par la prestation choisie.
      return ls.length === 1 && !ls[0].designation && !ls[0].prix ? [nouvelle] : [...ls, nouvelle];
    });
  const total = useMemo(
    () => lignes.reduce((s, l) => s + totalLigne({ quantite: lireNombre(l.quantite || "1") ?? 0, prixUnitaireCentimes: lireCentimes(l.prix || "0") ?? 0 }), 0),
    [lignes]
  );

  function clientChoisi(nom: string) {
    const c = clients.find((x) => x.nom === nom);
    if (!c) return;
    if (c.adresse && !adresse) setAdresse(c.adresse);
    if (c.email && !email) setEmail(c.email);
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {valeurs.id && <input type="hidden" name="id" value={valeurs.id} />}
      {valeurs.devisId && <input type="hidden" name="devisId" value={valeurs.devisId} />}

      <section className="grid gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-2">
        <h2 className="text-sm font-semibold text-brand-slate sm:col-span-2">Client</h2>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Nom
          <input
            name="clientNom"
            required
            list="clients-connus"
            defaultValue={valeurs.clientNom}
            onChange={(e) => clientChoisi(e.target.value)}
            placeholder="Mairie de…, École de…, IME…"
            className={champClass}
          />
          <datalist id="clients-connus">
            {clients.map((c) => (
              <option key={c.nom} value={c.nom} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Mail
          <input name="clientEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={champClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
          Adresse
          <textarea name="clientAdresse" rows={2} value={adresse} onChange={(e) => setAdresse(e.target.value)} className={champClass} />
        </label>
      </section>

      <section className="grid gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-2">
        <h2 className="text-sm font-semibold text-brand-slate sm:col-span-2">{estDevis ? "Devis" : "Facture"}</h2>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
          Objet
          <input name="objet" required defaultValue={valeurs.objet} placeholder="Ex. Interventions musicales à l'école de Méaudre" className={champClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
          Date de la prestation (facultatif)
          <input name="datePrestation" defaultValue={valeurs.datePrestation} placeholder="Ex. mardi 12 janvier 2027, ou de janvier à mars 2027" className={champClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          {estDevis ? "Date du devis" : "Date de la facture"}
          <input type="date" name={estDevis ? "dateDevis" : "dateFacture"} defaultValue={valeurs.date} className={champClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          {estDevis ? "Valable jusqu'au" : "Échéance de paiement"}
          <input type="date" name={estDevis ? "valableJusquAu" : "echeance"} defaultValue={valeurs.echeance} className={champClass} />
        </label>
      </section>

      <section className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-brand-slate">Prestations</h2>
          <select
            value=""
            onChange={(e) => {
              const r = rubriques.find((x) => x.id === e.target.value);
              if (r) ajouter(r);
            }}
            className={`${champClass} py-1.5`}
          >
            <option value="">+ Ajouter une prestation type…</option>
            {rubriques.map((r) => (
              <option key={r.id} value={r.id}>
                {r.libelle}
                {r.prixUnitaireCentimes != null ? ` (${euros(r.prixUnitaireCentimes)}${r.unite ? ` / ${r.unite}` : ""})` : ""}
              </option>
            ))}
          </select>
        </div>
        {lignes.map((l, n) => {
          const t = totalLigne({ quantite: lireNombre(l.quantite || "1") ?? 0, prixUnitaireCentimes: lireCentimes(l.prix || "0") ?? 0 });
          return (
            <div key={l.cle} className="grid grid-cols-6 gap-2 rounded-md bg-slate-50 p-2 sm:grid-cols-[minmax(0,1fr)_4.5rem_5.5rem_6rem_6rem_auto]">
              <textarea
                name="ligneDesignation"
                rows={1}
                value={l.designation}
                onChange={(e) => maj(l.cle, "designation", e.target.value)}
                placeholder="Désignation"
                aria-label={`Désignation de la ligne ${n + 1}`}
                className={`${champClass} col-span-6 min-w-0 sm:col-span-1`}
              />
              <input name="ligneQuantite" inputMode="decimal" value={l.quantite} onChange={(e) => maj(l.cle, "quantite", e.target.value)} placeholder="Qté" aria-label="Quantité" className={`${champClass} col-span-2 min-w-0 sm:col-span-1`} />
              <input name="ligneUnite" value={l.unite} onChange={(e) => maj(l.cle, "unite", e.target.value)} placeholder="Unité" aria-label="Unité" className={`${champClass} col-span-2 min-w-0 sm:col-span-1`} />
              <input name="lignePrix" inputMode="decimal" value={l.prix} onChange={(e) => maj(l.cle, "prix", e.target.value)} placeholder="Prix unit. €" aria-label="Prix unitaire en euros" className={`${champClass} col-span-2 min-w-0 sm:col-span-1`} />
              <span className="col-span-4 self-center text-right text-sm font-semibold tabular-nums text-slate-700 sm:col-span-1">{euros(t)}</span>
              <button
                type="button"
                onClick={() => setLignes((ls) => ls.filter((x) => x.cle !== l.cle))}
                disabled={lignes.length === 1}
                className="col-span-2 justify-self-end p-2 text-slate-400 hover:text-status-occupee disabled:opacity-30 sm:col-span-1"
                aria-label={`Retirer la ligne ${n + 1}`}
              >
                <IconTrash size={16} aria-hidden />
              </button>
            </div>
          );
        })}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => ajouter()} className="inline-flex items-center gap-1 text-xs font-medium text-brand-accent hover:underline">
            <IconPlus size={14} aria-hidden /> Ligne libre
          </button>
          <p className="text-sm text-slate-600">
            Total net : <strong className="text-base text-brand-slate">{euros(total)}</strong>
          </p>
        </div>
      </section>

      <section className="grid gap-3 rounded-lg bg-white p-4 shadow-sm">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Conditions de paiement (laisser vide pour celles par défaut)
          <textarea name="conditions" rows={2} defaultValue={valeurs.conditions} placeholder={conditionsParDefaut} className={champClass} />
        </label>
        {estDevis && (
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Notes internes (jamais imprimées)
            <textarea name="notes" rows={2} defaultValue={valeurs.notes} className={champClass} />
          </label>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enCours} className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60">
          {enCours ? "Enregistrement…" : estDevis ? "Enregistrer le devis" : "Émettre la facture"}
        </button>
        <Link href={annuler} className="text-sm text-slate-500 hover:underline">
          Annuler
        </Link>
        {!estDevis && <span className="text-xs text-slate-500">Une facture émise reçoit son numéro et ne se modifie plus.</span>}
        {etat.message && <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>}
      </div>
    </form>
  );
}
