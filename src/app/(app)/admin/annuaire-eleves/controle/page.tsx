import Link from "next/link";
import { rapprochementListes } from "@/lib/annuaireServeur";
import { nomAffiche } from "@/lib/annuaireEleves";

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

// Contrôle des listes d'élèves (direction, cf. admin/layout.tsx) : les élèves des listes
// d'appel que l'annuaire ne connaît pas, et les élèves de l'annuaire qui ne sont dans
// aucun cours (oubli à la rentrée, élève parti…).
export default async function ControleListesPage() {
  const { annuaire, inscriptions } = await rapprochementListes();
  const nonTrouves = inscriptions.filter((i) => !i.fiche);
  const ecritsAutrement = inscriptions.filter((i) => i.fiche && i.approche);
  const dansUnCours = new Set(inscriptions.map((i) => i.fiche).filter(Boolean));
  const sansCours = annuaire.filter((e) => !dansUnCours.has(e));

  const prof = (i: (typeof inscriptions)[number]) => `${i.classe.prof.prenom} ${i.classe.prof.nom}`;
  const lienCours = (i: (typeof inscriptions)[number]) => (
    <Link href={`/presences/${i.classe.id}`} className="text-brand-accent hover:underline">
      {i.classe.emoji} {i.classe.nom}
    </Link>
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <Link href="/admin/annuaire-eleves" className="text-sm text-brand-accent hover:underline">
          ‹ Annuaire des élèves
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-brand-slate">Contrôle des listes d&apos;élèves</h1>
        <p className="text-sm text-slate-500">
          Les {inscriptions.length} élèves des listes d&apos;appel comparés aux {annuaire.length} élèves de l&apos;annuaire. Un élève
          bien retrouvé a ses téléphones dans la liste d&apos;appel et sa fiche complète.
        </p>
      </div>

      {annuaire.length === 0 && (
        <p className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-sm">
          L&apos;annuaire est vide : <Link href="/admin/annuaire-eleves" className="text-brand-accent hover:underline">importez d&apos;abord le fichier des inscriptions</Link>.
        </p>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-brand-slate">
          Dans une liste d&apos;appel, pas trouvés dans l&apos;annuaire ({nonTrouves.length})
        </h2>
        {nonTrouves.length === 0 ? (
          <p className="text-sm text-status-dispo">Tous les élèves des listes sont retrouvés.</p>
        ) : (
          <>
            <p className="text-xs text-slate-500">
              Nom trop incomplet (prénom partagé par plusieurs élèves…) ou élève absent du fichier des inscriptions : demander au prof
              de compléter le nom dans son cours, ou vérifier l&apos;inscription.
            </p>
            <ul className="divide-y divide-slate-100 rounded-lg bg-white shadow-sm">
              {nonTrouves.map((i) => (
                <li key={`${i.classe.id}-${i.eleve.id}`} className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 py-2 text-sm">
                  <span className="font-medium text-slate-800">{i.eleve.nom}</span>
                  <span className="text-xs text-slate-500">
                    {lienCours(i)} · {prof(i)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-brand-slate">Dans l&apos;annuaire, dans aucun cours ({sansCours.length})</h2>
        {sansCours.length === 0 ? (
          <p className="text-sm text-status-dispo">Chaque élève de l&apos;annuaire est dans au moins un cours.</p>
        ) : (
          <>
            <p className="text-xs text-slate-500">
              Cours pas encore créé par le prof, élève écrit trop différemment dans sa liste, ou inscription abandonnée.
            </p>
            <ul className="divide-y divide-slate-100 rounded-lg bg-white shadow-sm">
              {sansCours.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 py-2 text-sm">
                  <Link href={`/annuaire/eleves/${e.id}`} className="font-medium text-slate-800 hover:text-brand-accent hover:underline">
                    {nomAffiche(e)}
                  </Link>
                  <span className="text-xs text-slate-500">{[e.instruments.join(", "), e.commune].filter(Boolean).join(" · ")}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {ecritsAutrement.length > 0 && (
        <details className="rounded-lg bg-white p-4 shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-brand-slate">
            Retrouvés malgré une écriture différente ({pluriel(ecritsAutrement.length, "élève")})
          </summary>
          <p className="mt-2 text-xs text-slate-500">
            L&apos;appli les a reconnus (prénom seul, faute, nom incomplet). À vérifier d&apos;un coup d&apos;œil ; le prof peut aussi
            corriger le nom dans son cours.
          </p>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {ecritsAutrement.map((i) => (
              <li key={`${i.classe.id}-${i.eleve.id}`} className="flex flex-wrap items-baseline justify-between gap-x-3 py-1.5">
                <span>
                  « {i.eleve.nom} » →{" "}
                  <Link href={`/annuaire/eleves/${i.fiche!.id}`} className="font-medium text-slate-800 hover:text-brand-accent hover:underline">
                    {nomAffiche(i.fiche!)}
                  </Link>
                </span>
                <span className="text-xs text-slate-500">
                  {lienCours(i)} · {prof(i)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
