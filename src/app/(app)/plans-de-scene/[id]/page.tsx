import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lireElements } from "@/lib/plansScene";
import { donneesEditeur } from "@/lib/plansSceneDonnees";
import { EditeurPlan } from "@/components/plans/EditeurPlan";
import { dupliquerPlan, garderCommeFormation, supprimerPlan } from "../actions";

// Éditeur d'un plan de scène.
export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const plan = await db.planScene.findUnique({
    where: { id },
    include: { evenement: { select: { id: true, titre: true } }, inscription: { select: { eleveNom: true, instrument: true } } },
  });
  if (!plan) notFound();
  const d = await donneesEditeur();
  const membres = { ...d.membres, "": plan.inscription ? [{ nom: plan.inscription.eleveNom, instrument: plan.inscription.instrument }] : [] };
  const peutSupprimer = session!.user.role === "ADMIN" || !plan.auteurId || plan.auteurId === session!.user.id;
  const retour = plan.evenement ? { href: `/saison/${plan.evenement.id}#plans`, libelle: plan.evenement.titre } : { href: "/plans-de-scene", libelle: "Plans de scène" };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      {plan.modele && <p className="rounded-md bg-violet-50 p-2 text-sm text-violet-900">Formation type : on peut la reprendre pour chaque concert de l&apos;ensemble.</p>}
      <EditeurPlan
        mode="plan"
        id={plan.id}
        initial={{ titre: plan.titre, notes: plan.notes ?? "", largeurCm: plan.largeurCm, profondeurCm: plan.profondeurCm, sceneId: plan.sceneId, classeId: plan.classeId, lieuId: null }}
        elementsInitiaux={lireElements(plan.elements)}
        catalogue={d.catalogue}
        scenes={d.scenes}
        classes={d.classes}
        membres={membres}
        retour={retour}
        impression={`/plans-de-scene/${plan.id}/imprimer`}
      />
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3 text-sm">
        <form action={dupliquerPlan}>
          <input type="hidden" name="id" value={plan.id} />
          <button type="submit" className="text-brand-accent hover:underline">
            Dupliquer ce plan
          </button>
        </form>
        {!plan.modele && (
          <form action={garderCommeFormation}>
            <input type="hidden" name="id" value={plan.id} />
            <button type="submit" className="text-brand-accent hover:underline">
              Garder comme formation type de l&apos;ensemble
            </button>
          </form>
        )}
        {peutSupprimer && (
          <form action={supprimerPlan}>
            <input type="hidden" name="id" value={plan.id} />
            <button type="submit" className="text-slate-400 hover:text-status-occupee">
              Supprimer ce plan
            </button>
          </form>
        )}
        <Link href="/plans-de-scene" className="ml-auto text-slate-500 hover:underline">
          Tous les plans
        </Link>
      </div>
    </div>
  );
}
