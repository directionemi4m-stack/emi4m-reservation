import Link from "next/link";
import { auth } from "@/lib/auth";
import { LIBELLE_CATEGORIE, type Categorie } from "@/lib/plansScene";
import { catalogue } from "@/lib/plansSceneServeur";
import { FormElementCatalogue } from "@/components/plans/FormElementCatalogue";

// Catalogue des éléments de scène et de leur encombrement au sol (largeur × profondeur, l'avant
// tourné vers le public). Modifiable par la direction.
export default async function CataloguePage() {
  const session = await auth();
  const estAdmin = session!.user.role === "ADMIN";
  const elements = await catalogue();
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div>
        <Link href="/plans-de-scene" className="text-sm text-brand-accent hover:underline">
          ‹ Plans de scène
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-brand-slate">Catalogue des instruments et du matériel</h1>
        <p className="text-sm text-slate-500">
          Encombrement au sol en centimètres, largeur × profondeur, place du musicien comprise (chaise, pupitre, archet, coulisse…). « Chaise »
          et « pupitre » servent à compter ce qu&apos;il faut installer. Les mots-clés relient les instruments de l&apos;annuaire des élèves.
        </p>
      </div>
      {estAdmin && (
        <section className="rounded-lg bg-white p-3 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-brand-slate">Ajouter un élément</h2>
          <FormElementCatalogue />
        </section>
      )}
      {(Object.keys(LIBELLE_CATEGORIE) as Categorie[]).map((c) => (
        <section key={c} className="rounded-lg bg-white p-3 shadow-sm">
          <h2 className="text-sm font-semibold text-brand-slate">{LIBELLE_CATEGORIE[c]}</h2>
          <div className="mt-1 flex flex-col divide-y divide-slate-100">
            {elements
              .filter((e) => e.categorie === c)
              .map((e) =>
                estAdmin ? (
                  <FormElementCatalogue key={e.id} valeurs={e} />
                ) : (
                  <p key={e.id} className="flex justify-between py-1.5 text-sm">
                    <span>{e.nom}</span>
                    <span className="tabular-nums text-slate-500">
                      {e.largeurCm} × {e.profondeurCm} cm
                    </span>
                  </p>
                )
              )}
          </div>
        </section>
      ))}
    </div>
  );
}
