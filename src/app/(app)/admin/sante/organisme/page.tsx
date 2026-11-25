import { IconExternalLink } from "@tabler/icons-react";
import { organismeSante } from "@/lib/santeTravailServeur";
import { champClass, FormSante, libelleClass } from "@/components/sante/FormSante";
import { enregistrerOrganisme } from "../actions";

// Le service de santé au travail auquel l'école adhère : coordonnées et numéro d'adhérent,
// repris sur les convocations envoyées aux salariés et sur les factures.
export default async function OrganismeSantePage() {
  const o = await organismeSante();
  return (
    <section className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-brand-slate">Service de santé au travail</h2>
        {o?.siteWeb && (
          <a href={o.siteWeb} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-brand-accent hover:underline">
            <IconExternalLink size={13} aria-hidden /> Espace adhérent
          </a>
        )}
      </div>
      <FormSante action={enregistrerOrganisme} libelle="Enregistrer" className="grid gap-3 sm:grid-cols-2">
        <label className={libelleClass}>
          Nom du service
          <input name="nom" defaultValue={o?.nom} required placeholder="Ex. le nom du SPSTI" className={champClass} />
        </label>
        <label className={libelleClass}>
          N° d&apos;adhérent
          <input name="numeroAdherent" defaultValue={o?.numeroAdherent ?? ""} className={champClass} />
        </label>
        <label className={`${libelleClass} sm:col-span-2`}>
          Adresse
          <textarea name="adresse" rows={2} defaultValue={o?.adresse ?? ""} className={champClass} />
        </label>
        <label className={libelleClass}>
          Téléphone
          <input name="telephone" type="tel" defaultValue={o?.telephone ?? ""} className={champClass} />
        </label>
        <label className={libelleClass}>
          Mail
          <input name="email" type="email" defaultValue={o?.email ?? ""} className={champClass} />
        </label>
        <label className={`${libelleClass} sm:col-span-2`}>
          Espace adhérent en ligne (lien)
          <input name="siteWeb" type="url" defaultValue={o?.siteWeb ?? ""} placeholder="https://…" className={champClass} />
        </label>
      </FormSante>
    </section>
  );
}
