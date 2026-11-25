import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft, IconFileTypePdf, IconTrash } from "@tabler/icons-react";
import { db } from "@/lib/db";
import { aujourdHuiUTC, champsVisite } from "@/lib/santeTravailServeur";
import {
  calculerSuivi,
  CATEGORIES,
  COULEUR_ETAT,
  dateCourte,
  DETAIL_CATEGORIE,
  LIBELLE_AVIS,
  LIBELLE_CATEGORIE,
  LIBELLE_ETAT,
  LIBELLE_STATUT_VISITE,
  LIBELLE_TYPE_VISITE,
} from "@/lib/santeTravail";
import { champClass, FormSante, libelleClass } from "@/components/sante/FormSante";
import { FormVisite } from "@/components/sante/FormVisite";
import { BoutonConfirme } from "@/components/sante/BoutonConfirme";
import { enregistrerSalarie, prevenirPourVisite, retirerAttestation, supprimerSalarie, supprimerVisite } from "../../actions";

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
const COULEUR_STATUT = {
  DEMANDEE: "bg-slate-100 text-slate-600",
  PREVUE: "bg-sky-100 text-sky-800",
  REALISEE: "bg-status-dispo/15 text-emerald-800",
  ANNULEE: "bg-slate-100 text-slate-400 line-through",
} as const;
const quandPrevenu = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

// Fiche de suivi d'un salarié : ses visites (passées et à venir) et ses dates d'emploi.
export default async function SalarieSantePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await db.salarieSante.findUnique({
    where: { id },
    include: { visites: { select: champsVisite, orderBy: [{ date: "desc" }, { creeLe: "desc" }] }, user: { select: { email: true, actif: true } } },
  });
  if (!s) notFound();
  const aujourdHui = aujourdHuiUTC();
  const suivi = calculerSuivi(s, aujourdHui);
  const peutPrevenir = !!s.user?.actif;
  const typeConseille = s.visites.some((v) => v.statut === "REALISEE") ? "PERIODIQUE" : "EMBAUCHE";

  return (
    <>
      <Link href="/admin/sante" className="inline-flex items-center gap-1 text-sm text-brand-accent hover:underline">
        <IconArrowLeft size={15} aria-hidden /> Tous les salariés
      </Link>

      <section className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-brand-slate">
            {s.prenom} {s.nom}
          </h2>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COULEUR_ETAT[suivi.etat]}`}>{LIBELLE_ETAT[suivi.etat]}</span>
        </div>
        <p className="text-sm text-slate-700">{suivi.phrase}</p>
        <p className="text-xs text-slate-500">
          {LIBELLE_CATEGORIE[s.categorie]}
          {suivi.echeance && suivi.etat !== "SORTI" && ` · délai de suivi : avant le ${dateCourte(suivi.echeance)}`}
          {!peutPrevenir && " · pas de compte actif dans l'appli : à prévenir directement"}
        </p>
        {suivi.alertes.map((a) => (
          <p key={a.cle} className="rounded-md bg-status-attente/10 px-2 py-1.5 text-sm text-slate-700">
            {a.texte}
          </p>
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-slate">Visites</h2>
        <ul className="flex flex-col divide-y divide-slate-100">
          {s.visites.map((v) => {
            const aVenir = v.statut === "PREVUE" && v.date && v.date >= aujourdHui;
            return (
              <li key={v.id} className="flex flex-col gap-2 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {LIBELLE_TYPE_VISITE[v.type]}
                      {v.date && ` · ${dateCourte(v.date)}`}
                      {v.heure && ` à ${v.heure}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {[
                        v.lieu,
                        v.avis && LIBELLE_AVIS[v.avis],
                        v.prochaineAvant && `prochaine visite avant le ${dateCourte(v.prochaineAvant)}`,
                        v.salariePrevenuLe && `prévenu le ${quandPrevenu(v.salariePrevenuLe)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {v.commentaire && <p className="text-xs italic text-slate-500">{v.commentaire}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${COULEUR_STATUT[v.statut]}`}>{LIBELLE_STATUT_VISITE[v.statut]}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {v.nomFichier && (
                    <>
                      <a href={`/api/sante/visites/${v.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        <IconFileTypePdf size={14} aria-hidden /> Attestation
                      </a>
                      <BoutonConfirme action={retirerAttestation} id={v.id} question="Retirer l'attestation de cette visite ?">
                        Retirer l&apos;attestation
                      </BoutonConfirme>
                    </>
                  )}
                  {aVenir && peutPrevenir && (
                    <FormSante action={prevenirPourVisite} libelle={v.salariePrevenuLe ? `Prévenir ${s.prenom} à nouveau` : `Prévenir ${s.prenom}`} enCours="Envoi…" secondaire className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={v.id} />
                    </FormSante>
                  )}
                  <BoutonConfirme action={supprimerVisite} id={v.id} question="Supprimer cette visite (et son attestation) ?">
                    <IconTrash size={13} aria-hidden /> Supprimer
                  </BoutonConfirme>
                </div>
                <details className="rounded-md bg-slate-50 p-3">
                  <summary className="cursor-pointer text-xs font-medium text-brand-accent">
                    {v.statut === "PREVUE" || v.statut === "DEMANDEE" ? "Mettre à jour (réalisée, reportée…)" : "Modifier"}
                  </summary>
                  <div className="mt-3">
                    <FormVisite
                      salarieId={s.id}
                      prenom={s.prenom}
                      peutPrevenir={peutPrevenir}
                      visite={{
                        id: v.id,
                        type: v.type,
                        statut: v.statut,
                        date: iso(v.date),
                        heure: v.heure ?? "",
                        lieu: v.lieu ?? "",
                        avis: v.avis ?? "",
                        prochaineAvant: iso(v.prochaineAvant),
                        commentaire: v.commentaire ?? "",
                        aPdf: !!v.nomFichier,
                      }}
                    />
                  </div>
                </details>
              </li>
            );
          })}
          {s.visites.length === 0 && <li className="py-2 text-sm text-slate-500">Aucune visite enregistrée. Ajoutez au moins la dernière visite connue.</li>}
        </ul>
      </section>

      <section className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-slate">Ajouter une visite</h2>
        <p className="text-xs text-slate-500">
          Une convocation reçue du service, une visite demandée (reprise après un arrêt…), ou une visite déjà passée avec son attestation.
          Visite de reprise obligatoire après un congé maternité, un arrêt pour accident du travail d&apos;au moins 30 jours, ou un arrêt
          maladie d&apos;au moins 60 jours.
        </p>
        {/* La clé recrée le formulaire quand le type conseillé change (première visite enregistrée). */}
        <FormVisite key={typeConseille} salarieId={s.id} prenom={s.prenom} peutPrevenir={peutPrevenir} typeConseille={typeConseille} />
      </section>

      <section className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-slate">Fiche</h2>
        <FormSante action={enregistrerSalarie} libelle="Enregistrer la fiche" className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={s.id} />
          {!s.userId && (
            <>
              <label className={libelleClass}>
                Prénom
                <input name="prenom" defaultValue={s.prenom} required className={champClass} />
              </label>
              <label className={libelleClass}>
                Nom
                <input name="nom" defaultValue={s.nom} required className={champClass} />
              </label>
            </>
          )}
          <label className={libelleClass}>
            Poste
            <input name="poste" defaultValue={s.poste ?? ""} placeholder="Ex. professeur de violon" className={champClass} />
          </label>
          <label className={libelleClass}>
            Année de naissance (facultatif)
            <input name="anneeNaissance" inputMode="numeric" defaultValue={s.anneeNaissance ?? ""} placeholder="Pour la visite de mi-carrière" className={champClass} />
          </label>
          <fieldset className="flex flex-col gap-2 sm:col-span-2">
            <legend className="mb-1 text-xs font-medium text-slate-600">Type de suivi</legend>
            {CATEGORIES.map((c) => (
              <label key={c} className="flex items-start gap-2 text-sm text-slate-700">
                <input type="radio" name="categorie" value={c} defaultChecked={s.categorie === c} className="mt-1 accent-brand-accent" />
                <span>
                  <strong>{LIBELLE_CATEGORIE[c]}</strong> <span className="text-xs text-slate-500">— {DETAIL_CATEGORIE[c]}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <label className={libelleClass}>
            Embauché le
            <input type="date" name="embaucheLe" defaultValue={iso(s.embaucheLe)} className={champClass} />
          </label>
          <label className={libelleClass}>
            Parti le
            <input type="date" name="sortieLe" defaultValue={iso(s.sortieLe)} className={champClass} />
          </label>
          <label className={libelleClass}>
            Déclaré au service le
            <input type="date" name="affilieLe" defaultValue={iso(s.affilieLe)} className={champClass} />
          </label>
          <label className={libelleClass}>
            Départ signalé au service le
            <input type="date" name="desaffilieLe" defaultValue={iso(s.desaffilieLe)} className={champClass} />
          </label>
          <label className={`${libelleClass} sm:col-span-2`}>
            Notes (facultatif)
            <textarea name="notes" rows={2} defaultValue={s.notes ?? ""} placeholder="Aucune information médicale" className={champClass} />
          </label>
        </FormSante>
        {s.visites.length === 0 && (
          <form action={supprimerSalarie} className="border-t border-slate-100 pt-3">
            <input type="hidden" name="id" value={s.id} />
            <button type="submit" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-status-occupee">
              <IconTrash size={13} aria-hidden /> Supprimer cette fiche (créée par erreur)
            </button>
          </form>
        )}
      </section>
    </>
  );
}
