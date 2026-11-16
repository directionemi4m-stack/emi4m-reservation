import Link from "next/link";
import { notFound } from "next/navigation";
import { IconExternalLink, IconFileTypePdf } from "@tabler/icons-react";
import { db } from "@/lib/db";
import { chargerFacture } from "@/lib/devisServeur";
import { lireCoordonnees } from "@/lib/coordonneesServeur";
import { euros, prochainNumero, totalDocument, totalLigne } from "@/lib/devis";
import { EnvoiMailForm } from "@/components/devis/EnvoiMailForm";
import { BadgeEtat } from "@/components/devis/BadgeEtat";
import { basculerFacturePayee, supprimerFactureEmise } from "../../actions";

const dateLongue = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const debutDuJour = () => {
  const m = new Date();
  return new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate()));
};
const bouton = "inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";

export default async function FacturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await chargerFacture(id);
  if (!f) notFound();
  const [coordonnees, memeAnnee] = await Promise.all([lireCoordonnees(), db.factureEmise.findMany({ where: { annee: f.annee }, select: { numero: true } })]);
  const derniere = prochainNumero("F", f.annee, memeAnnee.map((x) => x.numero)) === prochainNumero("F", f.annee, [f.numero]);
  const total = totalDocument(f.lignes);
  const enRetard = !f.payeeLe && f.echeance < debutDuJour();
  const signature = [coordonnees.representant ?? "La direction", `${coordonnees.nom} (${coordonnees.sigle})`, coordonnees.telephone].filter(Boolean).join("\n");
  const message = `Bonjour,\n\nVeuillez trouver ci-joint notre facture n° ${f.numero} : ${f.objet}, d'un montant de ${euros(total)}, à régler avant le ${dateLongue(f.echeance)}.\n\nBien cordialement,\n${signature}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/devis/factures" className="text-sm text-brand-accent hover:underline">
            ‹ Factures
          </Link>
          <h2 className="mt-1 flex flex-wrap items-center gap-2 text-lg font-semibold text-brand-slate">
            Facture {f.numero}{" "}
            <BadgeEtat etat={f.payeeLe ? "PAYEE" : enRetard ? "EN_RETARD" : "A_PAYER"} libelle={f.payeeLe ? `Payée le ${dateLongue(f.payeeLe)}` : enRetard ? "En retard" : "À payer"} />
          </h2>
          <p className="text-sm text-slate-600">
            {f.clientNom} · {f.objet}
          </p>
        </div>
        <p className="text-2xl font-semibold tabular-nums text-brand-slate">{euros(total)}</p>
      </div>

      <section className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <a href={`/api/devis/${f.id}?type=facture`} target="_blank" rel="noopener" className={bouton}>
            <IconFileTypePdf size={16} aria-hidden /> Voir le PDF
          </a>
          <form action={basculerFacturePayee}>
            <input type="hidden" name="id" value={f.id} />
            <button type="submit" className={f.payeeLe ? bouton : "rounded-md bg-status-dispo px-3 py-2 text-sm font-semibold text-white hover:bg-status-dispo/90"}>
              {f.payeeLe ? "Annuler le paiement" : "✓ Marquer payée aujourd'hui"}
            </button>
          </form>
          {derniere && (
            <form action={supprimerFactureEmise}>
              <input type="hidden" name="id" value={f.id} />
              <button type="submit" className={`${bouton} text-status-occupee`}>
                Supprimer (dernière facture de {f.annee})
              </button>
            </form>
          )}
        </div>
        <EnvoiMailForm type="FACTURE" id={f.id} a={f.clientEmail ?? ""} sujet={`Facture ${f.numero} — ${coordonnees.sigle}`} message={message} dejaEnvoye={!!f.envoyeeLe} />
      </section>

      <section className="flex flex-col gap-2 rounded-lg bg-white p-4 text-sm shadow-sm">
        <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Facturé à</dt>
            <dd className="whitespace-pre-line text-slate-700">{[f.clientNom, f.clientAdresse, f.clientEmail].filter(Boolean).join("\n")}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Dates</dt>
            <dd className="text-slate-700">
              Facture du {dateLongue(f.dateFacture)}, échéance le {dateLongue(f.echeance)}
              {f.datePrestation && <span className="block">Prestation : {f.datePrestation}</span>}
              {f.devis && (
                <span className="block">
                  Devis{" "}
                  <Link href={`/admin/devis/${f.devis.id}`} className="text-brand-accent hover:underline">
                    {f.devis.numero}
                  </Link>
                </span>
              )}
            </dd>
          </div>
        </dl>
        <table className="mt-2 w-full text-sm">
          <tbody>
            {f.lignes.map((l) => (
              <tr key={l.id} className="border-b border-slate-100 align-top">
                <td className="py-1.5 pr-2 text-slate-700">{l.designation}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {l.quantite.toLocaleString("fr-FR")} {l.unite}
                </td>
                <td className="py-1.5 text-right tabular-nums">{euros(l.prixUnitaireCentimes)}</td>
                <td className="py-1.5 text-right font-medium tabular-nums">{euros(totalLigne(l))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap gap-3 pt-1 text-xs text-slate-500">
          {f.envoyeeLe && <span>Envoyée le {dateLongue(f.envoyeeLe)}</span>}
          {f.pdfUrl && (
            <a href={f.pdfUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-brand-accent hover:underline">
              <IconExternalLink size={14} aria-hidden /> PDF archivé (Drive)
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
