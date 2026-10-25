import Link from "next/link";
import { db } from "@/lib/db";
import { HeuresHebdoForm } from "@/components/admin/HeuresHebdoForm";
import { formaterDuree, volumeHebdoMinutes } from "@/lib/agenda";
import { bilanForfait, SEMAINES_FORFAIT } from "@/lib/forfaitAccessoire";
import { anneeScolaireDebut, libelleAnneeScolaire } from "@/lib/fraisRecap";

// Valeur pré-remplie du champ, relisible par lireHeuresHebdo (« 5h30 », « 5 »).
function valeurChamp(minutes: number | undefined) {
  if (minutes === undefined) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : String(h);
}

function h(minutes: number | null) {
  return minutes === null ? "—" : formaterDuree(minutes);
}

export default async function ForfaitsPage({ searchParams }: { searchParams: Promise<{ annee?: string }> }) {
  const { annee } = await searchParams;
  const debutCourant = anneeScolaireDebut(new Date());
  const debut = annee && /^\d{4}-\d{4}$/.test(annee) ? Number(annee.slice(0, 4)) : debutCourant;
  const anneeScolaire = libelleAnneeScolaire(debut);

  const salaries = await db.user.findMany({
    where: { actif: true },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    include: {
      heuresHebdoContrats: { where: { anneeScolaire } },
      creneauxAgenda: true,
      activitesAccessoires: {
        where: {
          supprimeLe: null,
          date: { gte: new Date(Date.UTC(debut, 8, 1)), lt: new Date(Date.UTC(debut + 1, 8, 1)) },
        },
        include: { typeEvenement: true },
      },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Forfaits d&apos;activité accessoire</h1>
        <p className="text-sm text-slate-500">
          Visible par la direction uniquement. Forfait annuel dû à l&apos;école = heures hebdo du contrat ×{" "}
          {SEMAINES_FORFAIT}. Au-delà, le dépassement est payé en fin d&apos;année ; les heures hors forfait
          (remplacements, financements exceptionnels) sont payées dans tous les cas.
        </p>
      </div>

      <div className="flex gap-2 text-sm">
        {[debutCourant - 1, debutCourant, debutCourant + 1].map((d) => (
          <Link
            key={d}
            href={`/admin/parametres/forfaits?annee=${libelleAnneeScolaire(d)}`}
            className={`rounded-md border px-3 py-1 ${
              d === debut ? "border-brand-accent bg-brand-accent/10 font-semibold text-brand-accent" : "border-slate-300 text-slate-600"
            }`}
          >
            {libelleAnneeScolaire(d)}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-100 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Salarié</th>
              <th className="px-3 py-2 font-medium">Heures hebdo du contrat</th>
              <th className="px-3 py-2 font-medium">Emploi du temps saisi</th>
              <th className="px-3 py-2 font-medium">Forfait</th>
              <th className="px-3 py-2 font-medium">Au forfait</th>
              <th className="px-3 py-2 font-medium">Reste</th>
              <th className="px-3 py-2 font-medium">Dépassement</th>
              <th className="px-3 py-2 font-medium">Hors forfait</th>
              <th className="px-3 py-2 font-medium">Total à payer</th>
            </tr>
          </thead>
          <tbody>
            {salaries.map((s) => {
              const contrat = s.heuresHebdoContrats[0];
              const b = bilanForfait(
                s.activitesAccessoires.map((a) => ({
                  duree: a.duree,
                  supprimeLe: a.supprimeLe,
                  horsForfait: a.typeEvenement.toujoursPaye || a.financementExceptionnel,
                })),
                contrat?.minutesHebdo ?? null
              );
              const edt = volumeHebdoMinutes(s.creneauxAgenda);
              return (
                <tr key={s.id} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2 text-slate-700">
                    {s.prenom} {s.nom}
                  </td>
                  <td className="px-3 py-2">
                    <HeuresHebdoForm
                      userId={s.id}
                      anneeScolaire={anneeScolaire}
                      valeurInitiale={valeurChamp(contrat?.minutesHebdo)}
                    />
                  </td>
                  <td className="px-3 py-2 text-slate-500">{s.creneauxAgenda.length ? formaterDuree(edt) : "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{h(b.forfaitMinutes)}</td>
                  <td className="px-3 py-2 text-slate-500">{formaterDuree(b.auForfaitMinutes)}</td>
                  <td className="px-3 py-2 text-slate-500">{h(b.resteMinutes)}</td>
                  <td className={`px-3 py-2 ${b.depassementMinutes ? "font-semibold text-status-occupee" : "text-slate-500"}`}>
                    {h(b.depassementMinutes)}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{formaterDuree(b.horsForfaitMinutes)}</td>
                  <td className="px-3 py-2 font-semibold text-brand-slate">{h(b.totalAPayerMinutes)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">
        « Emploi du temps saisi » : volume calculé depuis « Mon emploi du temps », à titre de comparaison avec
        le contrat. Laisser le champ vide puis OK retire le volume saisi.
      </p>
    </div>
  );
}
