import Link from "next/link";
import { db } from "@/lib/db";
import { aRelancer, etatDevis, euros, LIBELLE_ETAT, totalDocument, type EtatDevis } from "@/lib/devis";
import { BadgeEtat } from "@/components/devis/BadgeEtat";

const dateCourte = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const debutDuJour = () => {
  const m = new Date();
  return new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate()));
};
const FILTRES: { cle: string; libelle: string }[] = [
  { cle: "", libelle: "Tous" },
  { cle: "BROUILLON", libelle: "Brouillons" },
  { cle: "ENVOYE", libelle: "En attente de réponse" },
  { cle: "ACCEPTE", libelle: "Acceptés" },
  { cle: "REFUSE", libelle: "Refusés" },
  { cle: "EXPIRE", libelle: "Expirés" },
];

// Les devis faits par l'EMI4M, du plus récent au plus ancien.
export default async function DevisEmisPage({ searchParams }: { searchParams: Promise<{ etat?: string }> }) {
  const { etat: filtre = "" } = await searchParams;
  const aujourdHui = debutDuJour();
  const devis = await db.devisEmis.findMany({
    orderBy: [{ dateDevis: "desc" }, { numero: "desc" }],
    include: { lignes: true, factures: { select: { numero: true } } },
  });
  const liste = devis.map((d) => ({ ...d, etat: etatDevis(d.statut, d.valableJusquAu, aujourdHui) as EtatDevis, total: totalDocument(d.lignes) }));
  const visibles = filtre ? liste.filter((d) => d.etat === filtre) : liste;
  const enAttente = liste.filter((d) => d.etat === "ENVOYE");
  const acceptesAnnee = liste.filter((d) => d.etat === "ACCEPTE" && d.annee === aujourdHui.getUTCFullYear());

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {enAttente.length} en attente de réponse ({euros(enAttente.reduce((s, d) => s + d.total, 0))}) · {acceptesAnnee.length} accepté
          {acceptesAnnee.length > 1 ? "s" : ""} en {aujourdHui.getUTCFullYear()} ({euros(acceptesAnnee.reduce((s, d) => s + d.total, 0))})
        </p>
        <Link href="/admin/devis/nouveau" className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90">
          + Nouveau devis
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTRES.map((f) => (
          <Link
            key={f.cle}
            href={f.cle ? `/admin/devis?etat=${f.cle}` : "/admin/devis"}
            className={`rounded-full border px-3 py-1 text-xs ${filtre === f.cle ? "border-brand-accent bg-brand-accent/10 font-semibold text-brand-accent" : "border-slate-300 text-slate-600"}`}
          >
            {f.libelle}
          </Link>
        ))}
      </div>
      <ul className="flex flex-col divide-y divide-slate-100 rounded-lg bg-white shadow-sm">
        {visibles.map((d) => (
          <li key={d.id}>
            <Link href={`/admin/devis/${d.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-slate-50">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  {d.numero} · {d.clientNom}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {d.objet} · {dateCourte(d.dateDevis)}
                  {d.factures.length > 0 && ` · facturé (${d.factures.map((f) => f.numero).join(", ")})`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {aRelancer(d.statut, d.envoyeLe, d.valableJusquAu, aujourdHui) && <span className="text-xs text-status-attente">à relancer</span>}
                <span className="text-sm font-semibold tabular-nums text-slate-700">{euros(d.total)}</span>
                <BadgeEtat etat={d.etat} libelle={LIBELLE_ETAT[d.etat]} />
              </div>
            </Link>
          </li>
        ))}
        {visibles.length === 0 && (
          <li className="px-4 py-3 text-sm text-slate-500">
            {liste.length === 0 ? "Aucun devis pour l'instant : créez le premier avec « Nouveau devis »." : "Aucun devis dans cette catégorie."}
          </li>
        )}
      </ul>
    </div>
  );
}
