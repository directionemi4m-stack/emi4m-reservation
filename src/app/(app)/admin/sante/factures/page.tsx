import { IconExternalLink, IconFileTypePdf, IconTrash } from "@tabler/icons-react";
import { db } from "@/lib/db";
import { formaterEuros } from "@/lib/inventaire";
import { affilieEnAnnee, controleFacture, dateCourte } from "@/lib/santeTravail";
import { aujourdHuiUTC, organismeSante } from "@/lib/santeTravailServeur";
import { ChoixScan } from "@/components/achats/ChoixScan";
import { BoutonConfirme } from "@/components/sante/BoutonConfirme";
import { champClass, FormSante, libelleClass } from "@/components/sante/FormSante";
import { ajouterFactureSante, marquerFacturePayee, modifierFactureSante, rangerFactureDansDrive, supprimerFactureSante } from "../actions";

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
const enEuros = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2).replace(".", ","));

type ValeursFacture = {
  date: string;
  numero: string;
  objet: string;
  anneeCotisation: number;
  montant: string;
  nombreSalaries: string;
  echeance: string;
  payeeLe: string;
};

function ChampsFacture({ v }: { v: ValeursFacture }) {
  return (
    <>
      <label className={libelleClass}>
        Date de la facture
        <input type="date" name="date" defaultValue={v.date} required className={champClass} />
      </label>
      <label className={libelleClass}>
        N° de facture
        <input name="numero" defaultValue={v.numero} className={champClass} />
      </label>
      <label className={libelleClass}>
        Objet
        <input name="objet" defaultValue={v.objet} required placeholder="Ex. Cotisation 2027" className={champClass} />
      </label>
      <label className={libelleClass}>
        Année concernée
        <input name="anneeCotisation" inputMode="numeric" defaultValue={v.anneeCotisation} required className={champClass} />
      </label>
      <label className={libelleClass}>
        Montant TTC (€)
        <input name="montant" inputMode="decimal" defaultValue={v.montant} placeholder="Ex. 1 250,40" className={champClass} />
      </label>
      <label className={libelleClass}>
        Nombre de salariés facturés
        <input name="nombreSalaries" inputMode="numeric" defaultValue={v.nombreSalaries} placeholder="Pour vérifier la facture" className={champClass} />
      </label>
      <label className={libelleClass}>
        À payer avant le
        <input type="date" name="echeance" defaultValue={v.echeance} className={champClass} />
      </label>
      <label className={libelleClass}>
        Payée le
        <input type="date" name="payeeLe" defaultValue={v.payeeLe} className={champClass} />
      </label>
    </>
  );
}

// Factures du service de santé au travail, par année : montant, paiement, et nombre de
// salariés facturés comparé aux salariés déclarés dans l'appli.
export default async function FacturesSantePage() {
  const aujourdHui = aujourdHuiUTC();
  const anneeCourante = aujourdHui.getUTCFullYear();
  const [factures, salaries, organisme] = await Promise.all([
    db.factureSante.findMany({
      orderBy: [{ anneeCotisation: "desc" }, { date: "desc" }],
      select: {
        id: true,
        date: true,
        numero: true,
        objet: true,
        anneeCotisation: true,
        montantCentimes: true,
        nombreSalaries: true,
        echeance: true,
        payeeLe: true,
        facture: { select: { url: true } },
      },
    }),
    db.salarieSante.findMany({ select: { affilieLe: true, desaffilieLe: true } }),
    organismeSante(),
  ]);
  const annees = [...new Set(factures.map((f) => f.anneeCotisation))];
  const affilies = (annee: number) => salaries.filter((s) => affilieEnAnnee(s, annee)).length;
  const aPayer = factures.filter((f) => !f.payeeLe);

  return (
    <>
      {aPayer.length > 0 && (
        <p className="rounded-md bg-status-attente/10 p-3 text-sm text-slate-700">
          {aPayer.length} facture{aPayer.length > 1 ? "s" : ""} à payer
          {aPayer.some((f) => f.montantCentimes !== null) && ` (${formaterEuros(aPayer.reduce((n, f) => n + (f.montantCentimes ?? 0), 0))})`}.
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-slate">Ajouter une facture{organisme && ` de ${organisme.nom}`}</h2>
        <FormSante action={ajouterFactureSante} libelle="Ajouter la facture" enCours="Envoi…" vider className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ChoixScan libelle="La facture (PDF ou photos)" />
          </div>
          <ChampsFacture
            v={{ date: iso(aujourdHui), numero: "", objet: `Cotisation ${anneeCourante}`, anneeCotisation: anneeCourante, montant: "", nombreSalaries: "", echeance: "", payeeLe: "" }}
          />
          <p className="text-xs text-slate-500 sm:col-span-2">La facture est aussi rangée dans le Drive avec les factures d&apos;achat, pour la comptabilité.</p>
        </FormSante>
      </section>

      {annees.map((annee) => {
        const liste = factures.filter((f) => f.anneeCotisation === annee);
        const total = liste.reduce((n, f) => n + (f.montantCentimes ?? 0), 0);
        const nb = affilies(annee);
        return (
          <section key={annee} className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-brand-slate">{annee}</h2>
              <p className="text-xs text-slate-500">
                {total > 0 && `${formaterEuros(total)} · `}
                {nb} salarié{nb > 1 ? "s" : ""} déclaré{nb > 1 ? "s" : ""} dans l&apos;appli
              </p>
            </div>
            <ul className="flex flex-col divide-y divide-slate-100">
              {liste.map((f) => {
                const controle = controleFacture(f.nombreSalaries, nb);
                const enRetard = !f.payeeLe && f.echeance && f.echeance < aujourdHui;
                return (
                  <li key={f.id} className="flex flex-col gap-2 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          {f.objet}
                          {f.montantCentimes !== null && ` · ${formaterEuros(f.montantCentimes)}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          Du {dateCourte(f.date)}
                          {f.numero && ` · n° ${f.numero}`}
                          {f.echeance && !f.payeeLe && ` · à payer avant le ${dateCourte(f.echeance)}`}
                        </p>
                        {controle && <p className={`text-xs ${controle.ok ? "text-emerald-700" : "font-medium text-status-occupee"}`}>{controle.texte}</p>}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          f.payeeLe ? "bg-status-dispo/15 text-emerald-800" : enRetard ? "bg-status-occupee/15 text-red-800" : "bg-status-attente/15 text-amber-800"
                        }`}
                      >
                        {f.payeeLe ? `Payée le ${dateCourte(f.payeeLe)}` : enRetard ? "En retard" : "À payer"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={`/api/sante/factures/${f.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        <IconFileTypePdf size={14} aria-hidden /> PDF
                      </a>
                      {f.facture ? (
                        <a href={f.facture.url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-brand-accent hover:underline">
                          <IconExternalLink size={13} aria-hidden /> Drive
                        </a>
                      ) : (
                        <FormSante action={rangerFactureDansDrive} libelle="Ranger dans le Drive" enCours="Envoi…" secondaire className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="id" value={f.id} />
                        </FormSante>
                      )}
                      <form action={marquerFacturePayee}>
                        <input type="hidden" name="id" value={f.id} />
                        {f.payeeLe && <input type="hidden" name="annuler" value="1" />}
                        <button type="submit" className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          {f.payeeLe ? "Pas encore payée" : "Payée aujourd'hui"}
                        </button>
                      </form>
                      <BoutonConfirme action={supprimerFactureSante} id={f.id} question="Supprimer cette facture ? La copie du Drive part dans la corbeille (récupérable 30 jours).">
                        <IconTrash size={13} aria-hidden /> Supprimer
                      </BoutonConfirme>
                    </div>
                    <details className="rounded-md bg-slate-50 p-3">
                      <summary className="cursor-pointer text-xs font-medium text-brand-accent">Modifier</summary>
                      <FormSante action={modifierFactureSante} libelle="Enregistrer" className="mt-3 grid gap-3 sm:grid-cols-2">
                        <input type="hidden" name="id" value={f.id} />
                        <ChampsFacture
                          v={{
                            date: iso(f.date),
                            numero: f.numero ?? "",
                            objet: f.objet,
                            anneeCotisation: f.anneeCotisation,
                            montant: enEuros(f.montantCentimes),
                            nombreSalaries: f.nombreSalaries === null ? "" : String(f.nombreSalaries),
                            echeance: iso(f.echeance),
                            payeeLe: iso(f.payeeLe),
                          }}
                        />
                      </FormSante>
                    </details>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {factures.length === 0 && <p className="rounded-lg bg-white p-4 text-sm text-slate-500 shadow-sm">Aucune facture pour l&apos;instant.</p>}
    </>
  );
}
