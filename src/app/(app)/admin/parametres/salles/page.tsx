import { db } from "@/lib/db";
import { AjouterCommuneForm } from "@/components/admin/AjouterCommuneForm";
import { AjouterSalleForm } from "@/components/admin/AjouterSalleForm";
import { ActionsSalle } from "@/components/admin/ActionsSalle";

export default async function AdminSallesPage() {
  const communes = await db.commune.findMany({
    include: { salles: { orderBy: { nom: "asc" } } },
    orderBy: { nom: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-brand-slate">Salles</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <AjouterCommuneForm />
        <AjouterSalleForm communes={communes.map((c) => ({ id: c.id, nom: c.nom }))} />
      </div>

      <div className="flex flex-col gap-4">
        {communes.map((commune) => (
          <div key={commune.id} className="rounded-lg bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-brand-slate">{commune.nom}</p>
            {commune.salles.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune salle.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <tbody>
                  {commune.salles.map((salle) => (
                    <tr key={salle.id} className="border-t border-slate-100">
                      <td className="py-2 text-slate-700">{salle.nom}</td>
                      <td className="py-2">
                        <span
                          className={
                            salle.actif
                              ? "rounded-full bg-status-dispo/15 px-2.5 py-0.5 text-xs font-medium text-status-dispo"
                              : "rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-500"
                          }
                        >
                          {salle.actif ? "Active" : "Désactivée"}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <ActionsSalle salleId={salle.id} actif={salle.actif} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
