import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { metres } from "@/lib/plansScene";
import { NouvelleScene } from "@/components/plans/NouvelleScene";
import { nouveauPlan } from "./actions";

const jour = (d: Date) => d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const aujourdHui = () => new Date(`${new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" })}T00:00:00.000Z`);
const champ = "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm";

// Plans de scène : concerts à venir, formations types des ensembles, scènes et catalogue.
export default async function PlansDeScenePage() {
  const session = await auth();
  const estAdmin = session!.user.role === "ADMIN";
  const [concerts, formations, libres, scenes, classes, lieux] = await Promise.all([
    db.evenementSaison.findMany({
      where: { date: { gte: aujourdHui() }, type: { not: "REUNION" } },
      orderBy: [{ date: "asc" }, { heureDebutMinutes: "asc" }],
      take: 12,
      select: { id: true, titre: true, date: true, scene: { select: { nom: true } }, _count: { select: { plans: true, inscriptions: true } } },
    }),
    db.planScene.findMany({ where: { modele: true }, orderBy: [{ classe: { nom: "asc" } }, { titre: "asc" }], select: { id: true, titre: true, classe: { select: { nom: true } } } }),
    db.planScene.findMany({ where: { modele: false, evenementId: null }, orderBy: { majLe: "desc" }, take: 20, select: { id: true, titre: true } }),
    db.sceneConcert.findMany({ where: { actif: true }, orderBy: { nom: "asc" }, include: { lieu: { select: { nom: true } } } }),
    db.classe.findMany({ where: { actif: true, type: "INSTRUMENT" }, orderBy: [{ agendaLibre: "desc" }, { nom: "asc" }], select: { id: true, nom: true, prof: { select: { prenom: true } } } }),
    estAdmin ? db.lieuPresence.findMany({ where: { actif: true }, orderBy: { nom: "asc" }, select: { id: true, nom: true } }) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Plans de scène</h1>
        <p className="text-sm text-slate-500">
          Un plan par passage de chaque concert, à l&apos;échelle de la scène, avec la place réelle de chaque instrument. La conduite plateau
          dit ce qu&apos;il faut ajouter ou retirer entre deux passages.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-brand-slate">Concerts à venir</h2>
        <ul className="flex flex-col divide-y divide-slate-100 rounded-lg bg-white shadow-sm">
          {concerts.map((c) => (
            <li key={c.id}>
              <Link href={`/saison/${c.id}#plans`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 hover:bg-slate-50">
                <span className="text-sm text-slate-800">
                  <span className="font-medium">{c.titre}</span> <span className="text-slate-500">· {jour(c.date)}</span>
                </span>
                <span className="text-xs text-slate-500">
                  {c.scene?.nom ?? "Scène à choisir"} · {c._count.plans} plan{c._count.plans > 1 ? "s" : ""} pour {c._count.inscriptions} passage
                  {c._count.inscriptions > 1 ? "s" : ""}
                </span>
              </Link>
            </li>
          ))}
          {concerts.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Aucun concert à venir dans la saison.</li>}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-brand-slate">Formations types des ensembles</h2>
        <p className="text-xs text-slate-500">
          Pour un ensemble à géométrie variable : une formation par configuration (complète, réduite, avec ou sans piano…), reprise ensuite dans
          les concerts.
        </p>
        <ul className="flex flex-col divide-y divide-slate-100 rounded-lg bg-white shadow-sm">
          {formations.map((f) => (
            <li key={f.id}>
              <Link href={`/plans-de-scene/${f.id}`} className="flex justify-between gap-2 px-4 py-2.5 text-sm hover:bg-slate-50">
                <span className="font-medium text-slate-800">{f.titre}</span>
                <span className="text-xs text-slate-500">{f.classe?.nom}</span>
              </Link>
            </li>
          ))}
          <li className="px-4 py-2.5">
            <form action={nouveauPlan} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="modele" value="1" />
              <select name="classeId" required defaultValue="" className={champ}>
                <option value="" disabled>
                  Ensemble…
                </option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} ({c.prof.prenom})
                  </option>
                ))}
              </select>
              <input name="titre" placeholder="Ex. Orchestre, formation complète" className={`${champ} min-w-48 flex-1`} />
              <button type="submit" className="rounded-md bg-brand-accent px-3 py-1.5 text-sm font-semibold text-white">
                + Nouvelle formation
              </button>
            </form>
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-brand-slate">Scènes et salles</h2>
          <Link href="/plans-de-scene/catalogue" className="text-xs font-medium text-brand-accent hover:underline">
            Catalogue des instruments et du matériel
          </Link>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {scenes.map((s) => (
            <li key={s.id}>
              <Link href={`/plans-de-scene/scenes/${s.id}`} className="flex flex-col rounded-lg bg-white px-4 py-2.5 shadow-sm hover:bg-slate-50">
                <span className="text-sm font-medium text-slate-800">{s.nom}</span>
                <span className="text-xs text-slate-500">
                  {metres(s.largeurCm)} × {metres(s.profondeurCm)}
                  {s.lieu && ` · ${s.lieu.nom}`}
                </span>
              </Link>
            </li>
          ))}
          {scenes.length === 0 && <li className="text-sm text-slate-500">Aucune scène enregistrée{estAdmin ? " : ajoutez les salles qu'on vous prête." : "."}</li>}
        </ul>
        {estAdmin && <NouvelleScene lieux={lieux} />}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-brand-slate">Autres plans</h2>
        <ul className="flex flex-col divide-y divide-slate-100 rounded-lg bg-white shadow-sm">
          {libres.map((p) => (
            <li key={p.id}>
              <Link href={`/plans-de-scene/${p.id}`} className="block px-4 py-2.5 text-sm text-slate-800 hover:bg-slate-50">
                {p.titre}
              </Link>
            </li>
          ))}
          <li className="px-4 py-2.5">
            <form action={nouveauPlan}>
              <button type="submit" className="text-sm font-medium text-brand-accent hover:underline">
                + Plan libre (répétition, autre événement…)
              </button>
            </form>
          </li>
        </ul>
      </section>
    </div>
  );
}
