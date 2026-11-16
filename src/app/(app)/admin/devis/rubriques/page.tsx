import { db } from "@/lib/db";
import { euros } from "@/lib/devis";
import { RubriqueForm } from "@/components/devis/RubriqueForm";
import { basculerRubrique } from "../actions";

const prixTexte = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ",").replace(",00", ""));

// Les prestations types proposées dans les devis et factures.
export default async function RubriquesPage() {
  const rubriques = await db.rubriquePrestation.findMany({ orderBy: [{ actif: "desc" }, { ordre: "asc" }] });
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-500">
        Les prestations proposées d&apos;un clic dans un devis ou une facture. Indiquez un prix pour qu&apos;il soit repris d&apos;office (il reste
        modifiable sur chaque devis).
      </p>
      <RubriqueForm />
      <ul className="flex flex-col divide-y divide-slate-100 rounded-lg bg-white shadow-sm">
        {rubriques.map((r) => (
          <li key={r.id} className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 ${r.actif ? "" : "opacity-50"}`}>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">{r.libelle}</p>
              <p className="text-xs text-slate-500">
                {[r.prixUnitaireCentimes != null ? `${euros(r.prixUnitaireCentimes)}${r.unite ? ` / ${r.unite}` : ""}` : `Prix à saisir${r.unite ? ` (par ${r.unite})` : ""}`, r.description]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <RubriqueForm rubrique={{ id: r.id, libelle: r.libelle, description: r.description, unite: r.unite, prix: prixTexte(r.prixUnitaireCentimes) }} />
              <form action={basculerRubrique}>
                <input type="hidden" name="id" value={r.id} />
                <button type="submit" className="text-xs text-slate-500 underline">
                  {r.actif ? "Masquer" : "Réafficher"}
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
