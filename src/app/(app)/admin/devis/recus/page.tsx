import Link from "next/link";
import { IconExternalLink } from "@tabler/icons-react";
import { db } from "@/lib/db";
import { euros } from "@/lib/devis";
import { AjoutDevisRecu } from "@/components/devis/AjoutDevisRecu";
import { ActionsDevisRecu } from "@/components/devis/ActionsDevisRecu";
import { ModifierDevisRecu } from "@/components/devis/ModifierDevisRecu";
import { BadgeEtat } from "@/components/devis/BadgeEtat";
import { lierFactureDevisRecu, supprimerDevisRecu } from "../actions";

const dateCourte = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const debutDuJour = () => {
  const m = new Date();
  return new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate()));
};
const GROUPES = [
  { statut: "EN_ATTENTE", titre: "En attente" },
  { statut: "SIGNE", titre: "Signés" },
  { statut: "ABANDONNE", titre: "Abandonnés" },
] as const;

// Devis des fournisseurs : archivés dans le Drive, suivis jusqu'à la signature (ou
// l'abandon), puis reliés à leur facture d'achat.
export default async function DevisRecusPage() {
  const aujourdHui = debutDuJour();
  const [devis, factures] = await Promise.all([
    db.devisRecu.findMany({ orderBy: [{ date: "desc" }, { ajouteLe: "desc" }], include: { facture: { select: { id: true, nomFichier: true, url: true } } } }),
    db.facture.findMany({ orderBy: { date: "desc" }, take: 200, select: { id: true, nomFichier: true, devisRecu: { select: { id: true } } } }),
  ]);
  const fournisseurs = [...new Set(devis.map((d) => d.fournisseur))].sort((a, b) => a.localeCompare(b, "fr"));

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-slate">Nouveau devis reçu</h2>
        <p className="text-xs text-slate-500">Archivé dans le Drive (« Devis reçus / année / En attente »), puis rangé dans « Signés » ou « Abandonnés ».</p>
        <AjoutDevisRecu fournisseurs={fournisseurs} />
      </section>

      {GROUPES.map((g) => {
        const liste = devis.filter((d) => d.statut === g.statut);
        if (liste.length === 0 && g.statut !== "EN_ATTENTE") return null;
        return (
          <section key={g.statut} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-brand-slate">
              {g.titre} ({liste.length}
              {liste.some((d) => d.montantCentimes) && ` · ${euros(liste.reduce((s, d) => s + (d.montantCentimes ?? 0), 0))}`})
            </h2>
            <ul className="flex flex-col divide-y divide-slate-100 rounded-lg bg-white shadow-sm">
              {liste.map((d) => {
                const expire = d.statut === "EN_ATTENTE" && d.valableJusquAu && d.valableJusquAu < aujourdHui;
                const bientot = d.statut === "EN_ATTENTE" && d.valableJusquAu && !expire && d.valableJusquAu.getTime() - aujourdHui.getTime() <= 7 * 86400000;
                return (
                  <li key={d.id} className="flex flex-col gap-2 px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <a href={d.url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm font-medium text-slate-800 hover:text-brand-accent hover:underline">
                          {d.fournisseur} <IconExternalLink size={14} aria-hidden />
                        </a>
                        <p className="text-xs text-slate-500">
                          {[dateCourte(d.date), d.objet, d.valableJusquAu && `valable jusqu'au ${dateCourte(d.valableJusquAu)}`, d.motifAbandon && `abandon : ${d.motifAbandon}`]
                            .filter(Boolean)
                            .join(" · ")}
                          {expire && <span className="text-status-occupee"> · validité dépassée</span>}
                          {bientot && <span className="text-status-attente"> · validité bientôt dépassée</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {d.montantCentimes != null && <span className="text-sm font-semibold tabular-nums text-slate-700">{euros(d.montantCentimes)}</span>}
                        {d.facture && <BadgeEtat etat="FACTURE" libelle="Facturé" />}
                      </div>
                    </div>
                    <ModifierDevisRecu
                      devis={{
                        id: d.id,
                        fournisseur: d.fournisseur,
                        date: d.date.toISOString().slice(0, 10),
                        montant: d.montantCentimes != null ? (d.montantCentimes / 100).toFixed(2).replace(".", ",") : "",
                        objet: d.objet ?? "",
                        valableJusquAu: d.valableJusquAu?.toISOString().slice(0, 10) ?? "",
                      }}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <ActionsDevisRecu id={d.id} statut={d.statut} />
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        {d.signeUrl && (
                          <a href={d.signeUrl} target="_blank" rel="noopener" className="text-brand-accent hover:underline">
                            Version signée
                          </a>
                        )}
                        {d.statut === "SIGNE" && (
                          <form action={lierFactureDevisRecu} className="flex items-center gap-1">
                            <input type="hidden" name="id" value={d.id} />
                            <select name="factureId" defaultValue={d.facture?.id ?? ""} className="max-w-48 rounded-md border border-slate-300 px-2 py-1 text-xs" aria-label="Facture d'achat liée">
                              <option value="">Facture d&apos;achat liée…</option>
                              {factures
                                .filter((f) => !f.devisRecu || f.devisRecu.id === d.id)
                                .map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.nomFichier}
                                  </option>
                                ))}
                            </select>
                            <button type="submit" className="text-brand-accent underline">
                              Lier
                            </button>
                          </form>
                        )}
                        {d.facture && (
                          <Link href="/admin/achats" className="text-slate-500 hover:underline">
                            {d.facture.nomFichier}
                          </Link>
                        )}
                        <form action={supprimerDevisRecu}>
                          <input type="hidden" name="id" value={d.id} />
                          <button type="submit" className="text-slate-400 hover:text-status-occupee">
                            Supprimer
                          </button>
                        </form>
                      </div>
                    </div>
                  </li>
                );
              })}
              {liste.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Aucun devis en attente.</li>}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
