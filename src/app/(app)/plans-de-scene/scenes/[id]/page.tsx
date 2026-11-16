import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lireElements } from "@/lib/plansScene";
import { catalogue } from "@/lib/plansSceneServeur";
import { DessinPlan } from "@/components/plans/DessinPlan";
import { EditeurPlan } from "@/components/plans/EditeurPlan";
import { supprimerScene } from "../../actions";

// Une scène : dimensions et éléments fixes (la direction les modifie, les profs les voient).
export default async function ScenePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const [scene, elements, lieux] = await Promise.all([
    db.sceneConcert.findUnique({ where: { id } }),
    catalogue(),
    db.lieuPresence.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }),
  ]);
  if (!scene || !scene.actif) notFound();
  const fixes = lireElements(scene.elements);

  if (session!.user.role !== "ADMIN") {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-3">
        <h1 className="text-lg font-semibold text-brand-slate">{scene.nom}</h1>
        {scene.notes && <p className="whitespace-pre-line text-sm text-slate-600">{scene.notes}</p>}
        <DessinPlan largeur={scene.largeurCm} profondeur={scene.profondeurCm} elements={fixes} className="h-auto w-full rounded-lg bg-white" />
      </div>
    );
  }
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <EditeurPlan
        mode="scene"
        id={scene.id}
        initial={{ titre: scene.nom, notes: scene.notes ?? "", largeurCm: scene.largeurCm, profondeurCm: scene.profondeurCm, sceneId: null, classeId: null, lieuId: scene.lieuId }}
        elementsInitiaux={fixes}
        catalogue={elements}
        lieux={lieux.map((l) => ({ id: l.id, nom: l.nom }))}
        retour={{ href: "/plans-de-scene", libelle: "Plans de scène" }}
      />
      <form action={supprimerScene} className="border-t border-slate-200 pt-3">
        <input type="hidden" name="id" value={scene.id} />
        <button type="submit" className="text-sm text-slate-400 hover:text-status-occupee">
          Retirer cette scène de la liste
        </button>
      </form>
    </div>
  );
}
