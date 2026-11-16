import Link from "next/link";
import { db } from "@/lib/db";
import { euros } from "@/lib/devis";

const dateCourte = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// Achats de matériel d'occasion à des particuliers : chaque achat a son attestation de vente.
export default async function AchatsOccasionPage() {
  const attestations = await db.attestationAchat.findMany({ orderBy: [{ annee: "desc" }, { numero: "desc" }], include: { lignes: true } });
  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-brand-slate">Achats d&apos;occasion à un particulier</h2>
          <Link href="/admin/achats/occasion/nouveau" className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90">
            + Nouvelle attestation
          </Link>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Remplissez l&apos;attestation, imprimez-la pré-remplie et faites-la signer par le vendeur, puis déposez le scan signé : il est
          archivé dans le Drive (« Achats d&apos;occasion »), ajouté aux achats et, si vous le voulez, à l&apos;inventaire.
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-slate-100 rounded-lg bg-white shadow-sm">
        {attestations.map((a) => (
          <li key={a.id}>
            <Link href={`/admin/achats/occasion/${a.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-slate-50">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  {a.numero} · {a.vendeurNom}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {a.lignes.map((l) => l.designation).join(", ")} · {dateCourte(a.date)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums text-slate-700">{euros(a.lignes.reduce((s, l) => s + l.prixCentimes, 0))}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.signeLe ? "bg-status-dispo/15 text-emerald-800" : "bg-status-attente/15 text-amber-800"}`}>
                  {a.signeLe ? "Signée, archivée" : "À faire signer"}
                </span>
              </div>
            </Link>
          </li>
        ))}
        {attestations.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Aucune attestation pour l&apos;instant.</li>}
      </ul>
    </div>
  );
}
