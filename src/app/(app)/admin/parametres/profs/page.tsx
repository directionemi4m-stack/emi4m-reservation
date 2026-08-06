import { db } from "@/lib/db";
import { AjouterProfForm } from "@/components/admin/AjouterProfForm";
import { ActionsProf } from "@/components/admin/ActionsProf";

export default async function AdminProfsPage() {
  const profs = await db.user.findMany({ orderBy: [{ actif: "desc" }, { nom: "asc" }] });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-brand-slate">Profs</h1>

      <AjouterProfForm />

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nom</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Rôle</th>
              <th className="px-4 py-2 font-medium">Statut</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {profs.map((prof) => (
              <tr key={prof.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-700">
                  {prof.prenom} {prof.nom}
                </td>
                <td className="px-4 py-2 text-slate-500">{prof.email}</td>
                <td className="px-4 py-2 text-slate-500">
                  {prof.role === "ADMIN" ? "Direction" : "Prof"}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      prof.actif
                        ? "rounded-full bg-status-dispo/15 px-2.5 py-0.5 text-xs font-medium text-status-dispo"
                        : "rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-500"
                    }
                  >
                    {prof.actif ? "Actif" : "Désactivé"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <ActionsProf profId={prof.id} actif={prof.actif} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
