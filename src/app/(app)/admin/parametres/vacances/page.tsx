import { db } from "@/lib/db";
import { AjouterPeriodeVacancesForm } from "@/components/admin/AjouterPeriodeVacancesForm";
import { SupprimerPeriodeVacancesBouton } from "@/components/admin/SupprimerPeriodeVacancesBouton";
import { SynchroniserVacancesBouton } from "@/components/admin/SynchroniserVacancesBouton";

function formatDate(date: Date) {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

export default async function AdminVacancesPage() {
  const periodes = await db.periodeVacances.findMany({ orderBy: { debut: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-brand-slate">Vacances scolaires</h1>
          <p className="text-sm text-slate-500">
            Utilisées pour ne pas générer de séance pendant les vacances. Synchronisées chaque
            semaine depuis le calendrier scolaire officiel (zone A, académie de Grenoble) ; ajoutez
            une période à la main pour un pont ou une fermeture propre à l&apos;école.
          </p>
        </div>
        <SynchroniserVacancesBouton />
      </div>

      <AjouterPeriodeVacancesForm />

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Période</th>
              <th className="px-4 py-2 font-medium">Début</th>
              <th className="px-4 py-2 font-medium">Reprise</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {periodes.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-700">{p.nom}</td>
                <td className="px-4 py-2 text-slate-500">{formatDate(p.debut)}</td>
                <td className="px-4 py-2 text-slate-500">{formatDate(p.fin)}</td>
                <td className="px-4 py-2 text-right">
                  <SupprimerPeriodeVacancesBouton id={p.id} />
                </td>
              </tr>
            ))}
            {periodes.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-sm text-slate-500" colSpan={4}>
                  Aucune période de vacances.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
