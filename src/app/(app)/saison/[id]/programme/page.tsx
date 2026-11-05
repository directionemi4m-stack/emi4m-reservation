import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { minutesVersHeure } from "@/lib/agenda";
import { formaterMinutage, libelleLieu } from "@/lib/saison";
import { BoutonImprimer } from "@/components/ui/BoutonImprimer";

const formatDateLongue = (d: Date) =>
  d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// Le programme d'une heure musicale, mis en page pour l'impression (ou un PDF) : la version
// « public » (ordre de passage, élèves, œuvres) et la feuille du présentateur (avec durées,
// heure de passage estimée, profs et matériel à installer).
export default async function ProgrammePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const { id } = await params;
  const presentateur = (await searchParams).version === "presentateur";

  const evenement = await db.evenementSaison.findUnique({
    where: { id },
    include: { lieu: true, inscriptions: { orderBy: [{ ordre: "asc" }, { creeLe: "asc" }], include: { prof: true } } },
  });
  if (!evenement || evenement.type !== "HEURE_MUSICALE") notFound();

  const inscriptions = evenement.inscriptions;
  const total = inscriptions.reduce((s, i) => s + i.minutageSecondes, 0);
  const debut = evenement.heureDebutMinutes;
  // Heure de passage estimée : début + durées des passages précédents.
  const lignes = inscriptions.map((i, n) => {
    const avant = inscriptions.slice(0, n).reduce((s, x) => s + x.minutageSecondes, 0);
    return { ...i, passage: debut !== null ? minutesVersHeure(debut + Math.floor(avant / 60)) : null };
  });
  const materiel = inscriptions.filter((i) => i.materiel);
  const lieu = libelleLieu(evenement.lieu?.nom, evenement.lieuPrecis);

  const onglet = (actif: boolean, href: string, libelle: string) => (
    <Link
      href={href}
      className={`rounded-md border px-3 py-1 text-sm ${actif ? "border-brand-accent bg-brand-accent/10 font-semibold text-brand-accent" : "border-slate-300 text-slate-600"}`}
    >
      {libelle}
    </Link>
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/saison/${evenement.id}`} className="text-sm text-brand-accent hover:underline">
          ← {evenement.titre}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {onglet(!presentateur, `/saison/${evenement.id}/programme`, "Pour le public")}
          {onglet(presentateur, `/saison/${evenement.id}/programme?version=presentateur`, "Feuille du présentateur")}
          <BoutonImprimer />
        </div>
      </div>

      <article className="rounded-lg bg-white p-6 shadow-sm print:p-0 print:shadow-none">
        <header className="mb-5 border-b border-slate-200 pb-4 text-center">
          <p className="text-xs uppercase tracking-widest text-slate-500">École Musicale Itinérante des 4 Montagnes</p>
          <h1 className="mt-1 text-2xl font-semibold text-brand-slate">{evenement.titre}</h1>
          <p className="mt-1 text-sm text-slate-600 first-letter:uppercase">
            {formatDateLongue(evenement.date)}
            {debut !== null && ` à ${minutesVersHeure(debut)}`}
            {lieu && ` · ${lieu}`}
          </p>
          {presentateur && (
            <p className="mt-1 text-xs text-slate-500">
              {inscriptions.length} passage{inscriptions.length > 1 ? "s" : ""} · durée totale {formaterMinutage(total)}
              {debut !== null && ` · fin estimée vers ${minutesVersHeure(debut + Math.ceil(total / 60))}`}
            </p>
          )}
        </header>

        {inscriptions.length === 0 ? (
          <p className="text-center text-sm text-slate-500">Aucun élève inscrit pour l&apos;instant.</p>
        ) : (
          <ol className="flex flex-col">
            {lignes.map((i, n) => (
              <li key={i.id} className="flex gap-3 border-b border-slate-100 py-2 last:border-0 break-inside-avoid">
                <span className="w-6 shrink-0 text-right text-sm font-semibold text-slate-400">{n + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold text-slate-800">{i.eleveNom}</span>
                    <span className="text-slate-500"> · {i.instrument}</span>
                  </p>
                  <p className="text-sm italic text-slate-700">{i.programme}</p>
                  {presentateur && (
                    <p className="text-xs text-slate-500">
                      {[`Prof : ${i.prof.prenom} ${i.prof.nom}`, i.materiel && `Matériel : ${i.materiel}`, i.commentaire]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                {presentateur && (
                  <div className="shrink-0 text-right text-xs text-slate-500">
                    {i.passage && <p className="font-semibold text-slate-700">{i.passage}</p>}
                    <p>{formaterMinutage(i.minutageSecondes)}</p>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}

        {presentateur && materiel.length > 0 && (
          <section className="mt-5 break-inside-avoid border-t border-slate-200 pt-3">
            <h2 className="text-sm font-semibold text-brand-slate">Matériel à installer</h2>
            <ul className="text-sm text-slate-600">
              {materiel.map((i) => (
                <li key={i.id}>
                  {i.materiel} <span className="text-xs text-slate-400">({i.eleveNom}, {i.instrument})</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </div>
  );
}
