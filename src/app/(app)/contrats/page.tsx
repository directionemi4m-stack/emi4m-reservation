import { IconFileTypePdf } from "@tabler/icons-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { libelleAnneeScolaire } from "@/lib/fraisRecap";
import { LIBELLE_TYPE_CONTRAT } from "@/lib/contrats";
import { SignatureContrat } from "@/components/contrats/SignatureContrat";

const jour = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

// Mes contrats et avenants : ceux à signer (déjà signés par la présidence), puis l'historique.
export default async function MesContratsPage() {
  const session = await auth();
  const contrats = await db.contratProf.findMany({
    where: { profId: session!.user.id, OR: [{ papier: true }, { presidenceSigneLe: { not: null } }] },
    orderBy: [{ anneeDebut: "desc" }, { creeLe: "desc" }],
    select: { id: true, anneeDebut: true, type: true, titre: true, papier: true, presidenceSigneLe: true, presidenceNom: true, profSigneLe: true },
  });
  const aSigner = contrats.filter((c) => !c.papier && !c.profSigneLe);
  const autres = contrats.filter((c) => c.papier || c.profSigneLe);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Mes contrats</h1>
        <p className="text-sm text-slate-500">Vos contrats et avenants avec l&apos;EMI4M, année par année.</p>
      </div>

      {aSigner.map((c) => (
        <section key={c.id} className="flex flex-col gap-3 rounded-lg border-2 border-brand-accent/40 bg-white p-4 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase text-brand-accent">À signer</p>
            <h2 className="text-base font-semibold text-brand-slate">
              {LIBELLE_TYPE_CONTRAT[c.type]} {libelleAnneeScolaire(c.anneeDebut)} — {c.titre}
            </h2>
            <p className="text-xs text-slate-500">
              Signé pour l&apos;EMI4M par {c.presidenceNom} le {jour(c.presidenceSigneLe!)}.
            </p>
          </div>
          <SignatureContrat id={c.id} lienPdf={`/api/contrats/${c.id}`} />
        </section>
      ))}

      <section className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-slate">Mes documents signés</h2>
        <ul className="mt-2 flex flex-col divide-y divide-slate-100">
          {autres.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="text-sm text-slate-800">
                  {LIBELLE_TYPE_CONTRAT[c.type]} {libelleAnneeScolaire(c.anneeDebut)} — {c.titre}
                </p>
                <p className="text-xs text-slate-500">{c.papier ? "Signé sur papier" : `Signé le ${jour(c.profSigneLe!)}`}</p>
              </div>
              <a href={`/api/contrats/${c.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                <IconFileTypePdf size={14} aria-hidden /> PDF
              </a>
            </li>
          ))}
          {autres.length === 0 && <li className="py-2 text-sm text-slate-500">Aucun document pour l&apos;instant.</li>}
        </ul>
      </section>
    </div>
  );
}
