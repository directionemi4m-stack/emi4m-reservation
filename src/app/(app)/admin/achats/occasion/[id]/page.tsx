import Link from "next/link";
import { notFound } from "next/navigation";
import { IconExternalLink, IconFileTypePdf, IconTrash } from "@tabler/icons-react";
import { db } from "@/lib/db";
import { chargerAttestation } from "@/lib/attestationAchatServeur";
import { LIBELLE_DESTINATION, LIBELLE_PAIEMENT, montantEnLettres } from "@/lib/attestationAchat";
import { euros } from "@/lib/devis";
import { AttestationForm } from "@/components/achats/AttestationForm";
import { ArchivageAttestation } from "@/components/achats/ArchivageAttestation";
import { supprimerAttestation } from "../actions";

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
const dateLongue = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const prix = (c: number) => (c / 100).toFixed(2).replace(".", ",").replace(",00", "");
const bouton = "inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";

export default async function AttestationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ modifier?: string }> }) {
  const { id } = await params;
  const { modifier } = await searchParams;
  const a = await chargerAttestation(id);
  if (!a) notFound();
  const total = a.lignes.reduce((s, l) => s + l.prixCentimes, 0);

  if (modifier && !a.signeLe) {
    const lieux = await db.lieuPresence.findMany({ where: { actif: true }, orderBy: { nom: "asc" } });
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <h1 className="text-xl font-semibold text-brand-slate">Modifier l&apos;attestation {a.numero}</h1>
        <AttestationForm
          lieux={lieux.map((l) => l.nom)}
          valeurs={{
            id: a.id,
            date: iso(a.date),
            vendeurNom: a.vendeurNom,
            vendeurAdresse: a.vendeurAdresse ?? "",
            vendeurTelephone: a.vendeurTelephone ?? "",
            vendeurEmail: a.vendeurEmail ?? "",
            vendeurPiece: a.vendeurPiece ?? "",
            representant: a.representant ?? "",
            qualite: a.qualite ?? "",
            faitA: a.faitA ?? "",
            modePaiement: a.modePaiement ?? "",
            referencePaiement: a.referencePaiement ?? "",
            banque: a.banque ?? "",
            datePaiement: iso(a.datePaiement),
            dateRemise: iso(a.dateRemise),
            demandePar: a.demandePar ?? "",
            motif: a.motif ?? "",
            destination: a.destination ?? "",
            affectation: a.affectation ?? "",
            lignes: a.lignes.map((l) => ({ designation: l.designation, marqueModele: l.marqueModele ?? "", numeroSerie: l.numeroSerie ?? "", etat: l.etat ?? "", prix: prix(l.prixCentimes) })),
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/achats/occasion" className="text-sm text-brand-accent hover:underline">
            ‹ Achats d&apos;occasion
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-brand-slate">Attestation {a.numero}</h1>
          <p className="text-sm text-slate-600">
            {a.vendeurNom} · {dateLongue(a.date)}
          </p>
        </div>
        <p className="text-2xl font-semibold tabular-nums text-brand-slate">{euros(total)}</p>
      </div>

      <section className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <a href={`/api/attestations/${a.id}`} target="_blank" rel="noopener" className={bouton}>
            <IconFileTypePdf size={16} aria-hidden /> Attestation pré-remplie à imprimer
          </a>
          {!a.signeLe && (
            <>
              <Link href={`/admin/achats/occasion/${a.id}?modifier=1`} className={bouton}>
                Modifier
              </Link>
              <form action={supprimerAttestation}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className={`${bouton} text-status-occupee`}>
                  <IconTrash size={16} aria-hidden /> Supprimer
                </button>
              </form>
            </>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Imprimez en deux exemplaires, faites signer le vendeur (« Lu et approuvé, bon pour vente ») et signez pour l&apos;EMI4M ; la page 2
          (fiche interne) est pour la comptabilité.
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-slate">{a.signeLe ? `Signée et archivée le ${dateLongue(a.signeLe)}` : "Une fois signée"}</h2>
        {a.signeLe && (
          <div className="flex flex-wrap gap-3 text-sm">
            {a.signeUrl && (
              <a href={a.signeUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-brand-accent hover:underline">
                <IconExternalLink size={14} aria-hidden /> Attestation signée (Drive)
              </a>
            )}
            {a.pieceDriveFileId && <span className="text-slate-500">Pièce d&apos;identité archivée</span>}
            {a.facture && (
              <Link href="/admin/achats" className="text-brand-accent hover:underline">
                Dans les achats : {a.facture.nomFichier}
              </Link>
            )}
            {a.facture?.articles.map((x) => (
              <Link key={x.id} href="/admin/inventaire" className="text-brand-accent hover:underline">
                Inventaire : {x.numeroImmo !== null ? `N°${x.numeroImmo} · ` : ""}
                {x.designation}
              </Link>
            ))}
          </div>
        )}
        <ArchivageAttestation id={a.id} dejaSignee={!!a.signeLe} dejaInventaire={!!a.facture?.articles.length || !!a.factureId} />
      </section>

      <section className="flex flex-col gap-2 rounded-lg bg-white p-4 text-sm shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="py-1 font-medium">Matériel</th>
              <th className="py-1 font-medium">N° de série</th>
              <th className="py-1 font-medium">État</th>
              <th className="py-1 text-right font-medium">Prix</th>
            </tr>
          </thead>
          <tbody>
            {a.lignes.map((l) => (
              <tr key={l.id} className="border-b border-slate-100 align-top">
                <td className="py-1.5 pr-2 text-slate-700">
                  {l.designation}
                  {l.marqueModele && <span className="block text-xs text-slate-500">{l.marqueModele}</span>}
                </td>
                <td className="py-1.5 pr-2 text-slate-600">{l.numeroSerie}</td>
                <td className="py-1.5 pr-2 text-slate-600">{l.etat}</td>
                <td className="py-1.5 text-right tabular-nums">{euros(l.prixCentimes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs italic text-slate-500">Soit {montantEnLettres(total)}.</p>
        <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Vendeur</dt>
            <dd className="whitespace-pre-line text-slate-700">{[a.vendeurNom, a.vendeurAdresse, a.vendeurTelephone, a.vendeurEmail, a.vendeurPiece].filter(Boolean).join("\n")}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Paiement</dt>
            <dd className="text-slate-700">
              {a.modePaiement ? LIBELLE_PAIEMENT[a.modePaiement] : "Non renseigné"}
              {a.referencePaiement && ` n° ${a.referencePaiement}`}
              {a.banque && ` (${a.banque})`}
              {a.datePaiement && `, le ${dateLongue(a.datePaiement)}`}
              {a.destination && <span className="block">{LIBELLE_DESTINATION[a.destination]}</span>}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
