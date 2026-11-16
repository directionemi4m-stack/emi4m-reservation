"use client";

import { useActionState } from "react";
import { enregistrerCoordonnees, type EtatAction } from "@/app/(app)/admin/parametres/ecole/actions";
import type { Coordonnees } from "@/lib/programmes";

const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

export function CoordonneesForm({ coordonnees }: { coordonnees: Coordonnees }) {
  const [etat, action, enCours] = useActionState(enregistrerCoordonnees, { succes: true } as EtatAction);
  const champ = (nom: keyof Coordonnees, libelle: string, aide?: string, large = false) => (
    <label className={`flex flex-col gap-1 text-xs font-medium text-slate-600 ${large ? "sm:col-span-2" : ""}`}>
      {libelle}
      <input name={nom} defaultValue={coordonnees[nom] ?? ""} className={champClass} />
      {aide && <span className="font-normal text-slate-400">{aide}</span>}
    </label>
  );
  const texteLong = (nom: keyof Coordonnees, libelle: string, aide: string) => (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
      {libelle}
      <textarea name={nom} rows={2} defaultValue={coordonnees[nom] ?? ""} className={champClass} />
      <span className="font-normal text-slate-400">{aide}</span>
    </label>
  );
  return (
    <form action={action} className="grid gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-2">
      {champ("nom", "Nom de l'école", undefined, true)}
      {champ("sigle", "Sigle")}
      {champ("representant", "Représentant légal", "Ex. « Marie Dupont, présidente »")}
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
        Adresse du siège
        <textarea name="adresse" rows={2} defaultValue={coordonnees.adresse} className={champClass} />
      </label>
      {champ("telephone", "Téléphone")}
      {champ("email", "Mail")}
      {champ("siteWeb", "Site internet")}
      {champ("siret", "SIRET", "14 chiffres")}
      {champ("numeroSacem", "Numéro de client SACEM", "Figure sur vos courriers ou factures SACEM")}
      <h2 className="mt-2 text-sm font-semibold text-brand-slate sm:col-span-2">Facturation (devis et factures aux clients)</h2>
      {champ("mentionTva", "Mention TVA", "Ex. « TVA non applicable », avec l'article que votre comptable vous donne", true)}
      {texteLong("conditionsPaiement", "Conditions de paiement", "Reprises par défaut sur chaque devis et facture")}
      {texteLong("mentionsFacture", "Mentions en bas des factures", "Pénalités de retard, indemnité de recouvrement…")}
      {champ("iban", "IBAN", "Imprimé sur les factures pour le paiement par virement")}
      {champ("bic", "BIC")}
      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={enCours}
          className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60"
        >
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </button>
        {etat.message && <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>}
      </div>
    </form>
  );
}
