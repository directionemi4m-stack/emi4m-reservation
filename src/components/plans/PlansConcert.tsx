import Link from "next/link";
import { db } from "@/lib/db";
import { changements, lireElements, metres, musiciens, texteChangements } from "@/lib/plansScene";
import { plansTries } from "@/lib/plansSceneOrdre";
import { choisirSceneConcert, deplacerPlan, nouveauPlan } from "@/app/(app)/plans-de-scene/actions";

const champ = "rounded-md border border-slate-300 bg-white px-2 py-1 text-xs";

// Section « Plans de scène » d'un concert : la scène, un plan par passage (créé vide, à partir
// du passage précédent ou d'une formation type), et la conduite plateau.
export async function PlansConcert({ evenementId, sceneId, inscriptions }: { evenementId: string; sceneId: string | null; inscriptions: { id: string; eleveNom: string; instrument: string }[] }) {
  const [plans, scenes, formations, classes] = await Promise.all([
    db.planScene.findMany({ where: { evenementId }, include: { inscription: { select: { ordre: true } } } }),
    db.sceneConcert.findMany({ where: { actif: true }, orderBy: { nom: "asc" }, select: { id: true, nom: true, largeurCm: true, profondeurCm: true } }),
    db.planScene.findMany({ where: { modele: true }, orderBy: [{ classe: { nom: "asc" } }, { titre: "asc" }], select: { id: true, titre: true } }),
    db.classe.findMany({ where: { actif: true, type: "INSTRUMENT" }, orderBy: [{ agendaLibre: "desc" }, { nom: "asc" }], select: { id: true, nom: true, prof: { select: { prenom: true } } } }),
  ]);
  const tries = plansTries(plans);
  const parInscription = new Map(plans.filter((p) => p.inscriptionId).map((p) => [p.inscriptionId!, p]));
  const libres = tries.filter((p) => !p.inscriptionId);
  const avec = tries.map((p) => ({ ...p, liste: lireElements(p.elements) }));
  const indice = new Map(avec.map((p, i) => [p.id, i]));
  const resume = (id: string) => {
    const i = indice.get(id)!;
    const p = avec[i];
    const d = i > 0 ? changements(avec[i - 1].liste, p.liste) : null;
    return `${musiciens(p.liste)} musicien${musiciens(p.liste) > 1 ? "s" : ""}${d === null ? "" : d.length ? ` · ${texteChangements(d)}` : " · même plateau"}`;
  };
  const choixSource = (
    <select name="source" defaultValue={tries.length ? "precedent" : "vide"} className={champ} aria-label="À partir de">
      <option value="vide">Plan vide</option>
      {tries.length > 0 && <option value="precedent">À partir du passage précédent</option>}
      {formations.length > 0 && (
        <optgroup label="Formations types">
          {formations.map((f) => (
            <option key={f.id} value={f.id}>
              {f.titre}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );

  return (
    <section id="plans" className="flex scroll-mt-4 flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-brand-slate">Plans de scène</h2>
        {plans.length > 0 && (
          <Link href={`/saison/${evenementId}/conduite`} className="text-xs font-medium text-brand-accent hover:underline">
            Conduite plateau (à imprimer)
          </Link>
        )}
      </div>
      <form action={choisirSceneConcert} className="flex flex-wrap items-center gap-2 text-sm">
        <input type="hidden" name="evenementId" value={evenementId} />
        <span className="text-slate-600">Scène :</span>
        <select name="sceneId" defaultValue={sceneId ?? ""} className={champ}>
          <option value="">À choisir</option>
          {scenes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nom} ({metres(s.largeurCm)} × {metres(s.profondeurCm)})
            </option>
          ))}
        </select>
        <button type="submit" className="text-xs font-medium text-brand-accent hover:underline">
          Enregistrer
        </button>
        {scenes.length === 0 && (
          <Link href="/plans-de-scene" className="text-xs text-slate-500 underline">
            ajouter une scène
          </Link>
        )}
      </form>

      {inscriptions.length > 0 && (
        <ul className="flex flex-col divide-y divide-slate-100">
          {inscriptions.map((i, n) => {
            const p = parInscription.get(i.id);
            return (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="text-slate-800">
                  <span className="mr-2 font-semibold text-slate-400">{n + 1}</span>
                  {i.eleveNom} · {i.instrument}
                  {p && <span className="ml-2 text-xs text-slate-500">{resume(p.id)}</span>}
                </span>
                {p ? (
                  <Link href={`/plans-de-scene/${p.id}`} className="text-xs font-medium text-brand-accent hover:underline">
                    Ouvrir le plan
                  </Link>
                ) : (
                  <form action={nouveauPlan} className="flex flex-wrap items-center gap-1.5">
                    <input type="hidden" name="evenementId" value={evenementId} />
                    <input type="hidden" name="inscriptionId" value={i.id} />
                    {choixSource}
                    <button type="submit" className="rounded-md bg-brand-accent px-2 py-1 text-xs font-semibold text-white">
                      Créer le plan
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {libres.length > 0 && (
        <ul className="flex flex-col divide-y divide-slate-100 border-t border-slate-100">
          {libres.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span className="text-slate-800">
                {p.titre}
                <span className="ml-2 text-xs text-slate-500">{resume(p.id)}</span>
              </span>
              <span className="flex items-center gap-2">
                {(["haut", "bas"] as const).map((sens) => (
                  <form key={sens} action={deplacerPlan}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="sens" value={sens} />
                    <button type="submit" className="text-xs text-slate-500 hover:text-brand-accent" aria-label={sens === "haut" ? "Plus tôt" : "Plus tard"}>
                      {sens === "haut" ? "▲" : "▼"}
                    </button>
                  </form>
                ))}
                <Link href={`/plans-de-scene/${p.id}`} className="text-xs font-medium text-brand-accent hover:underline">
                  Ouvrir le plan
                </Link>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form action={nouveauPlan} className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2">
        <input type="hidden" name="evenementId" value={evenementId} />
        <input name="titre" placeholder="Autre passage (ensemble, groupe…)" className={`${champ} min-w-44 flex-1`} />
        <select name="classeId" defaultValue="" className={champ} aria-label="Ensemble">
          <option value="">Ensemble…</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom} ({c.prof.prenom})
            </option>
          ))}
        </select>
        {choixSource}
        <button type="submit" className="rounded-md border border-brand-accent px-2 py-1 text-xs font-semibold text-brand-accent">
          + Ajouter un plan
        </button>
      </form>
      <p className="text-xs text-slate-400">Un passage d&apos;élève suit l&apos;ordre du programme ; les autres plans se placent avec ▲ ▼.</p>
    </section>
  );
}
