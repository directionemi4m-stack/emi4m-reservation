import { db } from "@/lib/db";
import { AjouterItemForm } from "@/components/admin/AjouterItemForm";
import { ActionsItemPresence } from "@/components/admin/ActionsItemPresence";
import {
  ajouterLieu,
  basculerActifLieu,
  supprimerLieu,
  ajouterNiveauFM,
  basculerActifNiveauFM,
  supprimerNiveauFM,
} from "./actions";

export default async function AdminPresencesConfigPage() {
  const [lieux, niveaux] = await Promise.all([
    db.lieuPresence.findMany({ orderBy: [{ actif: "desc" }, { nom: "asc" }] }),
    db.niveauFM.findMany({ orderBy: [{ actif: "desc" }, { nom: "asc" }] }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-brand-slate">Présences — Lieux & niveaux</h1>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-4">
          <AjouterItemForm titre="Ajouter un lieu" placeholder="Nom du lieu" action={ajouterLieu} />
          <div className="overflow-hidden rounded-lg bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <tbody>
                {lieux.map((lieu) => (
                  <tr key={lieu.id} className="border-t border-slate-100 first:border-t-0">
                    <td className="px-4 py-2 text-slate-700">{lieu.nom}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          lieu.actif
                            ? "rounded-full bg-status-dispo/15 px-2.5 py-0.5 text-xs font-medium text-status-dispo"
                            : "rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-500"
                        }
                      >
                        {lieu.actif ? "Actif" : "Désactivé"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ActionsItemPresence
                        id={lieu.id}
                        actif={lieu.actif}
                        basculerAction={basculerActifLieu}
                        supprimerAction={supprimerLieu}
                      />
                    </td>
                  </tr>
                ))}
                {lieux.length === 0 && (
                  <tr>
                    <td className="px-4 py-3 text-sm text-slate-500" colSpan={3}>
                      Aucun lieu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <AjouterItemForm
            titre="Ajouter un niveau FM"
            placeholder="Nom du niveau"
            action={ajouterNiveauFM}
          />
          <div className="overflow-hidden rounded-lg bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <tbody>
                {niveaux.map((niveau) => (
                  <tr key={niveau.id} className="border-t border-slate-100 first:border-t-0">
                    <td className="px-4 py-2 text-slate-700">{niveau.nom}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          niveau.actif
                            ? "rounded-full bg-status-dispo/15 px-2.5 py-0.5 text-xs font-medium text-status-dispo"
                            : "rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-500"
                        }
                      >
                        {niveau.actif ? "Actif" : "Désactivé"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ActionsItemPresence
                        id={niveau.id}
                        actif={niveau.actif}
                        basculerAction={basculerActifNiveauFM}
                        supprimerAction={supprimerNiveauFM}
                      />
                    </td>
                  </tr>
                ))}
                {niveaux.length === 0 && (
                  <tr>
                    <td className="px-4 py-3 text-sm text-slate-500" colSpan={3}>
                      Aucun niveau.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
