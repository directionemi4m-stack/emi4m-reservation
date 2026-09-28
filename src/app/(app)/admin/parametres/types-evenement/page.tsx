import { db } from "@/lib/db";
import { AjouterTypeEvenementForm } from "@/components/admin/AjouterTypeEvenementForm";
import { ActionsItemPresence } from "@/components/admin/ActionsItemPresence";
import { basculerActifTypeEvenement, supprimerTypeEvenement } from "./actions";

export default async function AdminTypesEvenementPage() {
  const types = await db.typeEvenementAccessoire.findMany({
    orderBy: [{ actif: "desc" }, { nom: "asc" }],
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Types d&apos;événement</h1>
        <p className="text-sm text-slate-500">
          Types d&apos;activité accessoire proposés aux profs (heure musicale, concert, réunion…).
        </p>
      </div>

      <AjouterTypeEvenementForm />

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[400px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Type d&apos;événement</th>
              <th className="px-4 py-2 font-medium">Statut</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {types.map((type) => (
              <tr key={type.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-700">{type.nom}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      type.actif
                        ? "rounded-full bg-status-dispo/15 px-2.5 py-0.5 text-xs font-medium text-status-dispo"
                        : "rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-500"
                    }
                  >
                    {type.actif ? "Actif" : "Désactivé"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <ActionsItemPresence
                    id={type.id}
                    actif={type.actif}
                    basculerAction={basculerActifTypeEvenement}
                    supprimerAction={supprimerTypeEvenement}
                  />
                </td>
              </tr>
            ))}
            {types.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-sm text-slate-500" colSpan={3}>
                  Aucun type d&apos;événement.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
