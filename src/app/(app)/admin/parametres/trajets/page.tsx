import { db } from "@/lib/db";
import { AjouterTypeTrajetForm } from "@/components/admin/AjouterTypeTrajetForm";
import { ActionsItemPresence } from "@/components/admin/ActionsItemPresence";
import { basculerActifTypeTrajet, supprimerTypeTrajet } from "./actions";

export default async function AdminTrajetsPage() {
  const types = await db.typeTrajet.findMany({
    orderBy: [{ actif: "desc" }, { nom: "asc" }],
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Types de trajet</h1>
        <p className="text-sm text-slate-500">
          Barème kilométrique proposé aux profs pour déclarer leurs frais de déplacement.
        </p>
      </div>

      <AjouterTypeTrajetForm />

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Trajet</th>
              <th className="px-4 py-2 font-medium">Km</th>
              <th className="px-4 py-2 font-medium">Prix</th>
              <th className="px-4 py-2 font-medium">Statut</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {types.map((type) => (
              <tr key={type.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-700">{type.nom}</td>
                <td className="px-4 py-2 text-slate-500">{type.km} km</td>
                <td className="px-4 py-2 text-slate-500">{type.prix.toFixed(2)} €</td>
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
                    basculerAction={basculerActifTypeTrajet}
                    supprimerAction={supprimerTypeTrajet}
                  />
                </td>
              </tr>
            ))}
            {types.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-sm text-slate-500" colSpan={5}>
                  Aucun trajet type.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
