import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { COULEUR_STATUT_IDEE, LIBELLE_STATUT_IDEE, LIBELLE_TYPE_IDEE } from "@/lib/idees";
import { NouvelleIdee } from "@/components/idees/NouvelleIdee";

const jour = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

// Boîte à idées des profs : une idée pour l'école ou une amélioration de l'appli, et le suivi
// (statut, réponse de la direction) de celles qu'on a envoyées à son nom.
export default async function IdeesPage() {
  const session = await auth();
  const mesIdees = await db.idee.findMany({ where: { auteurId: session!.user.id }, orderBy: { creeLe: "desc" } });
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Boîte à idées</h1>
        <p className="text-sm text-slate-500">Une idée pour l&apos;école, ou quelque chose qui vous simplifierait la vie dans l&apos;appli ? Dites-le à la direction.</p>
      </div>
      <NouvelleIdee />
      {mesIdees.length > 0 && (
        <section className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-brand-slate">Mes idées</h2>
          <ul className="mt-2 flex flex-col divide-y divide-slate-100">
            {mesIdees.map((i) => (
              <li key={i.id} className="flex flex-col gap-1 py-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{i.titre}</p>
                    <p className="text-xs text-slate-500">
                      {LIBELLE_TYPE_IDEE[i.type]} · {jour(i.creeLe)}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COULEUR_STATUT_IDEE[i.statut]}`}>{LIBELLE_STATUT_IDEE[i.statut]}</span>
                </div>
                {i.reponse && (
                  <p className="whitespace-pre-line rounded-md bg-brand-accent/5 p-2 text-sm text-slate-700">
                    <span className="font-medium text-brand-slate">La direction : </span>
                    {i.reponse}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
