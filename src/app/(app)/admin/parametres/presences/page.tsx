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
  ajouterDiscipline,
  basculerActifDiscipline,
  supprimerDiscipline,
  type EtatAction,
} from "./actions";

interface Item {
  id: string;
  nom: string;
  actif: boolean;
}

function BlocGestion({
  titre,
  placeholder,
  items,
  videMessage,
  ajouterAction,
  basculerAction,
  supprimerAction,
}: {
  titre: string;
  placeholder: string;
  items: Item[];
  videMessage: string;
  ajouterAction: (etat: EtatAction, formData: FormData) => Promise<EtatAction>;
  basculerAction: (formData: FormData) => Promise<void>;
  supprimerAction: (etat: EtatAction, formData: FormData) => Promise<EtatAction>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <AjouterItemForm titre={titre} placeholder={placeholder} action={ajouterAction} />
      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 first:border-t-0">
                <td className="px-4 py-2 text-slate-700">{item.nom}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      item.actif
                        ? "rounded-full bg-status-dispo/15 px-2.5 py-0.5 text-xs font-medium text-status-dispo"
                        : "rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-500"
                    }
                  >
                    {item.actif ? "Actif" : "Désactivé"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <ActionsItemPresence
                    id={item.id}
                    actif={item.actif}
                    basculerAction={basculerAction}
                    supprimerAction={supprimerAction}
                  />
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-sm text-slate-500" colSpan={3}>
                  {videMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function AdminPresencesConfigPage() {
  const [lieux, niveaux, disciplines] = await Promise.all([
    db.lieuPresence.findMany({ orderBy: [{ actif: "desc" }, { nom: "asc" }] }),
    db.niveauFM.findMany({ orderBy: [{ actif: "desc" }, { nom: "asc" }] }),
    db.discipline.findMany({ orderBy: [{ actif: "desc" }, { nom: "asc" }] }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-brand-slate">Présences — Lieux, niveaux & disciplines</h1>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <BlocGestion
          titre="Ajouter un lieu"
          placeholder="Nom du lieu"
          items={lieux}
          videMessage="Aucun lieu."
          ajouterAction={ajouterLieu}
          basculerAction={basculerActifLieu}
          supprimerAction={supprimerLieu}
        />
        <BlocGestion
          titre="Ajouter un niveau FM"
          placeholder="Nom du niveau"
          items={niveaux}
          videMessage="Aucun niveau."
          ajouterAction={ajouterNiveauFM}
          basculerAction={basculerActifNiveauFM}
          supprimerAction={supprimerNiveauFM}
        />
        <BlocGestion
          titre="Ajouter une discipline"
          placeholder="Nom de la discipline"
          items={disciplines}
          videMessage="Aucune discipline."
          ajouterAction={ajouterDiscipline}
          basculerAction={basculerActifDiscipline}
          supprimerAction={supprimerDiscipline}
        />
      </div>
    </div>
  );
}
