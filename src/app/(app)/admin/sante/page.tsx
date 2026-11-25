import Link from "next/link";
import { IconAlertTriangle, IconChevronRight } from "@tabler/icons-react";
import { chargerSuivis, organismeSante, profsSansFiche } from "@/lib/santeTravailServeur";
import { COULEUR_ETAT, LIBELLE_CATEGORIE, LIBELLE_ETAT, SUJETS_A_FAIRE, sujetsDe } from "@/lib/santeTravail";
import { champClass, FormSante, libelleClass } from "@/components/sante/FormSante";
import { ajouterSalarie, importerProfs } from "./actions";

// Santé au travail : chaque salarié, l'état de son suivi et ce qu'il reste à faire.
export default async function SantePage() {
  const [suivis, sansFiche, organisme] = await Promise.all([chargerSuivis(), profsSansFiche(), organismeSante()]);
  const presents = suivis.filter((s) => s.suivi.etat !== "SORTI");
  const partis = suivis.filter((s) => s.suivi.etat === "SORTI");
  const aFaire = SUJETS_A_FAIRE.map((sujet) => ({ ...sujet, salaries: suivis.filter((s) => sujetsDe(s.suivi).includes(sujet.cle)) })).filter(
    (sujet) => sujet.salaries.length > 0
  );
  const declares = presents.filter((s) => s.affilieLe && !s.desaffilieLe).length;

  return (
    <>
      {!organisme && (
        <p className="rounded-md bg-status-attente/10 p-3 text-sm text-slate-700">
          Indiquez d&apos;abord votre service de santé au travail dans l&apos;onglet{" "}
          <Link href="/admin/sante/organisme" className="font-medium text-brand-accent hover:underline">
            Service de santé
          </Link>
          .
        </p>
      )}

      {aFaire.length > 0 && (
        <section className="flex flex-col gap-2 rounded-lg border-l-4 border-status-attente bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-brand-slate">
            <IconAlertTriangle size={16} className="text-status-attente" aria-hidden /> À faire
          </h2>
          <ul className="flex flex-col gap-2.5 text-sm">
            {aFaire.map((sujet) => (
              <li key={sujet.cle}>
                <p className="font-medium text-slate-800">
                  {sujet.titre} ({sujet.salaries.length})
                </p>
                <p className="text-slate-600">
                  {sujet.salaries.map((s, i) => (
                    <span key={s.id}>
                      {i > 0 && ", "}
                      <Link href={`/admin/sante/salarie/${s.id}`} className="text-brand-accent hover:underline">
                        {s.prenom} {s.nom}
                      </Link>
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-brand-slate">Salariés ({presents.length})</h2>
          <p className="text-xs text-slate-500">
            {declares} déclaré{declares > 1 ? "s" : ""} au service
          </p>
        </div>
        <ul className="flex flex-col divide-y divide-slate-100">
          {presents.map((s) => (
            <li key={s.id}>
              <Link href={`/admin/sante/salarie/${s.id}`} className="flex items-center gap-3 py-2.5 hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">
                    {s.nom.toUpperCase()} {s.prenom}
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      {LIBELLE_CATEGORIE[s.categorie]}
                      {s.poste && ` · ${s.poste}`}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">{s.suivi.phrase}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${COULEUR_ETAT[s.suivi.etat]}`}>{LIBELLE_ETAT[s.suivi.etat]}</span>
                <IconChevronRight size={16} className="shrink-0 text-slate-300" aria-hidden />
              </Link>
            </li>
          ))}
          {presents.length === 0 && <li className="py-2 text-sm text-slate-500">Aucun salarié pour l&apos;instant : ajoutez les profs ci-dessous.</li>}
        </ul>
      </section>

      <section className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-slate">Ajouter des salariés</h2>
        {sansFiche.length > 0 && (
          <FormSante action={importerProfs} libelle={`Ajouter les ${sansFiche.length} prof${sansFiche.length > 1 ? "s" : ""} de l'appli`} className="flex flex-col gap-2">
            <p className="text-xs text-slate-500">Sans fiche : {sansFiche.map((p) => `${p.prenom} ${p.nom}`).join(", ")}.</p>
          </FormSante>
        )}
        <FormSante action={ajouterSalarie} libelle="Ajouter" vider className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
          <p className="text-xs text-slate-500 sm:col-span-2">Un salarié sans compte dans l&apos;appli (direction, secrétariat, remplaçant…) :</p>
          <label className={libelleClass}>
            Prénom
            <input name="prenom" required className={champClass} />
          </label>
          <label className={libelleClass}>
            Nom
            <input name="nom" required className={champClass} />
          </label>
          <label className={`${libelleClass} sm:col-span-2`}>
            Poste (facultatif)
            <input name="poste" placeholder="Ex. directeur, secrétaire" className={champClass} />
          </label>
        </FormSante>
      </section>

      {partis.length > 0 && (
        <details className="rounded-lg bg-white p-4 shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-brand-slate">Salariés partis ({partis.length})</summary>
          <ul className="mt-2 flex flex-col divide-y divide-slate-100">
            {partis.map((s) => (
              <li key={s.id}>
                <Link href={`/admin/sante/salarie/${s.id}`} className="flex items-center justify-between gap-2 py-2 text-sm hover:bg-slate-50">
                  <span className="text-slate-700">
                    {s.nom.toUpperCase()} {s.prenom}
                  </span>
                  <span className="text-xs text-slate-500">{s.suivi.phrase}</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
