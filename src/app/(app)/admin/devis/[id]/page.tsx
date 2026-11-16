import Link from "next/link";
import { notFound } from "next/navigation";
import { IconCopy, IconExternalLink, IconFileTypePdf, IconTrash } from "@tabler/icons-react";
import { db } from "@/lib/db";
import { chargerDevis, clientsConnus } from "@/lib/devisServeur";
import { lireCoordonnees } from "@/lib/coordonneesServeur";
import { aRelancer, CONDITIONS_DEFAUT, etatDevis, euros, LIBELLE_ETAT, totalDocument, totalLigne } from "@/lib/devis";
import { DocumentForm } from "@/components/devis/DocumentForm";
import { EnvoiMailForm } from "@/components/devis/EnvoiMailForm";
import { DecisionDevis } from "@/components/devis/DecisionDevis";
import { BadgeEtat } from "@/components/devis/BadgeEtat";
import { dupliquerDevis, marquerDevisEnvoye, supprimerDevis } from "../actions";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const dateLongue = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const debutDuJour = () => {
  const m = new Date();
  return new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate()));
};
const bouton = "inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";

export default async function DevisPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ modifier?: string }> }) {
  const { id } = await params;
  const { modifier } = await searchParams;
  const d = await chargerDevis(id);
  if (!d) notFound();
  const coordonnees = await lireCoordonnees();
  const etat = etatDevis(d.statut, d.valableJusquAu, debutDuJour());
  const total = totalDocument(d.lignes);

  if (d.statut === "BROUILLON" && modifier) {
    const [rubriques, clients] = await Promise.all([db.rubriquePrestation.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } }), clientsConnus()]);
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-brand-slate">Modifier le devis {d.numero}</h2>
        <DocumentForm
          type="DEVIS"
          valeurs={{
            id: d.id,
            clientNom: d.clientNom,
            clientAdresse: d.clientAdresse ?? "",
            clientEmail: d.clientEmail ?? "",
            objet: d.objet,
            datePrestation: d.datePrestation ?? "",
            date: iso(d.dateDevis),
            echeance: iso(d.valableJusquAu),
            conditions: d.conditions ?? "",
            notes: d.notes ?? "",
            lignes: d.lignes,
          }}
          rubriques={rubriques}
          clients={clients}
          conditionsParDefaut={coordonnees.conditionsPaiement || CONDITIONS_DEFAUT}
          annuler={`/admin/devis/${d.id}`}
        />
      </div>
    );
  }

  const signature = [coordonnees.representant ?? "La direction", `${coordonnees.nom} (${coordonnees.sigle})`, coordonnees.telephone].filter(Boolean).join("\n");
  const message = `Bonjour,\n\nVeuillez trouver ci-joint notre devis n° ${d.numero} : ${d.objet}, pour un montant de ${euros(total)}.\nIl est valable jusqu'au ${dateLongue(d.valableJusquAu)}. Pour l'accepter, merci de nous le retourner signé avec la mention « Bon pour accord ».\n\nBien cordialement,\n${signature}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/devis" className="text-sm text-brand-accent hover:underline">
            ‹ Devis émis
          </Link>
          <h2 className="mt-1 flex flex-wrap items-center gap-2 text-lg font-semibold text-brand-slate">
            Devis {d.numero} <BadgeEtat etat={etat} libelle={LIBELLE_ETAT[etat]} />
          </h2>
          <p className="text-sm text-slate-600">
            {d.clientNom} · {d.objet}
          </p>
        </div>
        <p className="text-2xl font-semibold tabular-nums text-brand-slate">{euros(total)}</p>
      </div>

      <section className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <a href={`/api/devis/${d.id}`} target="_blank" rel="noopener" className={bouton}>
            <IconFileTypePdf size={16} aria-hidden /> Voir le PDF
          </a>
          {d.statut === "BROUILLON" && (
            <Link href={`/admin/devis/${d.id}?modifier=1`} className={bouton}>
              Modifier
            </Link>
          )}
          {d.statut === "ACCEPTE" && (
            <Link href={`/admin/devis/factures/nouvelle?devis=${d.id}`} className="rounded-md bg-brand-accent px-3 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90">
              Faire la facture
            </Link>
          )}
          <form action={dupliquerDevis}>
            <input type="hidden" name="id" value={d.id} />
            <button type="submit" className={bouton}>
              <IconCopy size={16} aria-hidden /> Dupliquer
            </button>
          </form>
          {d.statut === "BROUILLON" && (
            <form action={supprimerDevis}>
              <input type="hidden" name="id" value={d.id} />
              <button type="submit" className={`${bouton} text-status-occupee`}>
                <IconTrash size={16} aria-hidden /> Supprimer le brouillon
              </button>
            </form>
          )}
        </div>
        {(d.statut === "BROUILLON" || d.statut === "ENVOYE") && (
          <div className="flex flex-wrap items-start gap-3 border-t border-slate-100 pt-3">
            <EnvoiMailForm type="DEVIS" id={d.id} a={d.clientEmail ?? ""} sujet={`Devis ${d.numero} — ${coordonnees.sigle}`} message={message} dejaEnvoye={d.statut === "ENVOYE"} />
            {d.statut === "BROUILLON" && (
              <form action={marquerDevisEnvoye}>
                <input type="hidden" name="id" value={d.id} />
                <button type="submit" className="mt-2 text-xs text-slate-500 underline">
                  Envoyé autrement (remis en main propre…)
                </button>
              </form>
            )}
          </div>
        )}
        {d.statut !== "BROUILLON" && (
          <div className="border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs font-semibold text-slate-500">Réponse du client</p>
            <DecisionDevis id={d.id} statut={d.statut} />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-lg bg-white p-4 text-sm shadow-sm">
        <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Client</dt>
            <dd className="whitespace-pre-line text-slate-700">{[d.clientNom, d.clientAdresse, d.clientEmail].filter(Boolean).join("\n")}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Dates</dt>
            <dd className="text-slate-700">
              Devis du {dateLongue(d.dateDevis)}, valable jusqu&apos;au {dateLongue(d.valableJusquAu)}
              {d.datePrestation && <span className="block">Prestation : {d.datePrestation}</span>}
            </dd>
          </div>
        </dl>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="py-1 font-medium">Désignation</th>
              <th className="py-1 text-right font-medium">Qté</th>
              <th className="py-1 text-right font-medium">Prix unit.</th>
              <th className="py-1 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {d.lignes.map((l) => (
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
        {d.notes && <p className="rounded-md bg-amber-50 p-2 text-xs text-slate-600">Notes internes : {d.notes}</p>}
      </section>

      <section className="flex flex-col gap-1 rounded-lg bg-white p-4 text-sm text-slate-600 shadow-sm">
        <h3 className="text-sm font-semibold text-brand-slate">Suivi</h3>
        <p>Créé le {dateLongue(d.creeLe)}</p>
        {d.envoyeLe && (
          <p>
            Envoyé le {dateLongue(d.envoyeLe)}
            {aRelancer(d.statut, d.envoyeLe, d.valableJusquAu, debutDuJour()) && <span className="text-status-attente"> · sans réponse depuis plus de 15 jours : à relancer</span>}
          </p>
        )}
        {d.decideLe && (
          <p>
            {d.statut === "ACCEPTE" ? "Accepté" : "Refusé"} le {dateLongue(d.decideLe)}
            {d.motifRefus && ` (${d.motifRefus})`}
          </p>
        )}
        {d.factures.map((f) => (
          <p key={f.id}>
            Facture{" "}
            <Link href={`/admin/devis/factures/${f.id}`} className="text-brand-accent hover:underline">
              {f.numero}
            </Link>
          </p>
        ))}
        <div className="flex flex-wrap gap-3 pt-1 text-xs">
          {d.pdfUrl && (
            <a href={d.pdfUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-brand-accent hover:underline">
              <IconExternalLink size={14} aria-hidden /> PDF envoyé (Drive)
            </a>
          )}
          {d.signeUrl && (
            <a href={d.signeUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-brand-accent hover:underline">
              <IconExternalLink size={14} aria-hidden /> Devis signé (Drive)
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
