import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { changements, lireElements, texteChangements } from "@/lib/plansScene";
import { FichePlan } from "@/components/plans/FichePlan";
import { BoutonImprimer } from "@/components/plans/BoutonImprimer";
import { plansTries } from "@/lib/plansSceneOrdre";

// Conduite plateau d'un concert : chaque passage avec son plan, et ce qu'il faut ajouter ou
// retirer depuis le passage précédent. À imprimer pour la régie et les profs.
export default async function ConduitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const evenement = await db.evenementSaison.findUnique({
    where: { id },
    include: { scene: { select: { nom: true } }, plans: { include: { inscription: { select: { ordre: true } } } } },
  });
  if (!evenement) notFound();
  const plans = plansTries(evenement.plans).map((p) => ({ ...p, liste: lireElements(p.elements) }));
  const date = evenement.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 print:max-w-none">
      <div className="print:hidden">
        <Link href={`/saison/${evenement.id}#plans`} className="text-sm text-brand-accent hover:underline">
          ‹ {evenement.titre}
        </Link>
      </div>
      <BoutonImprimer />
      <section className="flex break-after-page flex-col gap-2 rounded-lg bg-white p-4 shadow-sm print:p-0 print:shadow-none">
        <h1 className="text-xl font-semibold text-brand-slate">Conduite plateau — {evenement.titre}</h1>
        <p className="text-sm text-slate-600">
          {date}
          {evenement.scene && ` · ${evenement.scene.nom}`}
        </p>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-xs text-slate-500">
              <th className="py-1 pr-2">#</th>
              <th className="py-1 pr-2">Passage</th>
              <th className="py-1">Changement de plateau avant ce passage</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p, i) => {
              const delta = i === 0 ? null : changements(plans[i - 1].liste, p.liste);
              return (
                <tr key={p.id} className="border-b border-slate-100 align-top">
                  <td className="py-1.5 pr-2 font-semibold text-slate-400">{i + 1}</td>
                  <td className="py-1.5 pr-2 text-slate-800">{p.titre}</td>
                  <td className="py-1.5 text-slate-700">
                    {delta === null ? "Installation de départ" : delta.length === 0 ? "Aucun (vérifier le placement)" : texteChangements(delta)}
                  </td>
                </tr>
              );
            })}
            {plans.length === 0 && (
              <tr>
                <td colSpan={3} className="py-2 text-slate-500">
                  Aucun plan pour ce concert.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      {plans.map((p, i) => (
        <FichePlan
          key={p.id}
          numero={i + 1}
          titre={p.titre}
          largeur={p.largeurCm}
          profondeur={p.profondeurCm}
          elements={p.liste}
          notes={p.notes}
          changements={i === 0 ? null : changements(plans[i - 1].liste, p.liste)}
        />
      ))}
    </div>
  );
}
