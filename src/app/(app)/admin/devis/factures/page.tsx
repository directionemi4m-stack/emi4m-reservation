import Link from "next/link";
import { db } from "@/lib/db";
import { euros, totalDocument } from "@/lib/devis";
import { BadgeEtat } from "@/components/devis/BadgeEtat";

const dateCourte = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const debutDuJour = () => {
  const m = new Date();
  return new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate()));
};

// Les factures émises par l'EMI4M : payées, à payer, en retard.
export default async function FacturesEmisesPage() {
  const aujourdHui = debutDuJour();
  const factures = await db.factureEmise.findMany({ orderBy: [{ annee: "desc" }, { numero: "desc" }], include: { lignes: true, devis: { select: { numero: true } } } });
  const liste = factures.map((f) => ({
    ...f,
    total: totalDocument(f.lignes),
    etat: f.payeeLe ? "PAYEE" : f.echeance < aujourdHui ? "EN_RETARD" : "A_PAYER",
  }));
  const aEncaisser = liste.filter((f) => !f.payeeLe);
  const annee = aujourdHui.getUTCFullYear();
  const deLAnnee = liste.filter((f) => f.annee === annee);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          À encaisser : <strong>{euros(aEncaisser.reduce((s, f) => s + f.total, 0))}</strong> ({aEncaisser.length} facture{aEncaisser.length > 1 ? "s" : ""}
          {aEncaisser.some((f) => f.etat === "EN_RETARD") && <span className="text-status-occupee">, dont {aEncaisser.filter((f) => f.etat === "EN_RETARD").length} en retard</span>}) · Facturé en {annee} :{" "}
          {euros(deLAnnee.reduce((s, f) => s + f.total, 0))}
        </p>
        <Link href="/admin/devis/factures/nouvelle" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          + Facture sans devis
        </Link>
      </div>
      <p className="text-xs text-slate-500">Pour facturer un devis accepté, ouvrez le devis et cliquez sur « Faire la facture ».</p>
      <ul className="flex flex-col divide-y divide-slate-100 rounded-lg bg-white shadow-sm">
        {liste.map((f) => (
          <li key={f.id}>
            <Link href={`/admin/devis/factures/${f.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-slate-50">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  {f.numero} · {f.clientNom}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {f.objet} · {dateCourte(f.dateFacture)}
                  {f.devis && ` · devis ${f.devis.numero}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums text-slate-700">{euros(f.total)}</span>
                <BadgeEtat
                  etat={f.etat}
                  libelle={f.etat === "PAYEE" ? `Payée le ${dateCourte(f.payeeLe!)}` : f.etat === "EN_RETARD" ? `En retard (éch. ${dateCourte(f.echeance)})` : `À payer avant le ${dateCourte(f.echeance)}`}
                />
              </div>
            </Link>
          </li>
        ))}
        {liste.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Aucune facture émise pour l&apos;instant.</li>}
      </ul>
    </div>
  );
}
