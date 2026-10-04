import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CoordonneesForm } from "@/components/annuaire/CoordonneesForm";

export default async function AnnuairePage() {
  const session = await auth();

  const profs = await db.user.findMany({
    where: { actif: true },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    select: { id: true, nom: true, prenom: true, telephonePartage: true, emailPartage: true },
  });

  const moi = profs.find((p) => p.id === session!.user.id) ?? null;
  const collegues = profs.filter((p) => p.id !== session!.user.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-semibold text-brand-slate">Annuaire</h1>

      <div>
        <h2 className="mb-1 text-sm font-semibold text-brand-slate">Mes coordonnées</h2>
        <p className="mb-2 text-xs text-slate-500">
          Facultatif — seules les infos que vous renseignez ici sont visibles par vos collègues.
        </p>
        <CoordonneesForm
          telephonePartage={moi?.telephonePartage ?? null}
          emailPartage={moi?.emailPartage ?? null}
        />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-brand-slate">Collègues</h2>
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="bg-slate-100 text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Nom</th>
                <th className="px-4 py-2 font-medium">Téléphone</th>
                <th className="px-4 py-2 font-medium">Email</th>
              </tr>
            </thead>
            <tbody>
              {collegues.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-700">
                    {p.prenom} {p.nom}
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {p.telephonePartage ? (
                      <a href={`tel:${p.telephonePartage.replace(/\s+/g, "")}`} className="text-brand-accent hover:underline">
                        {p.telephonePartage}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {p.emailPartage ? (
                      <a href={`mailto:${p.emailPartage}`} className="text-brand-accent hover:underline">
                        {p.emailPartage}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {collegues.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-sm text-slate-500" colSpan={3}>
                    Aucun collègue pour l&apos;instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
