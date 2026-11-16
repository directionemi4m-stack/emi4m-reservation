import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { lireElements } from "@/lib/plansScene";
import { FichePlan } from "@/components/plans/FichePlan";
import { BoutonImprimer } from "@/components/plans/BoutonImprimer";

// Un plan de scène à imprimer (ou à enregistrer en PDF depuis le navigateur).
export default async function ImprimerPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await db.planScene.findUnique({ where: { id }, include: { evenement: { select: { titre: true, date: true } }, scene: { select: { nom: true } } } });
  if (!plan) notFound();
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-3">
      <BoutonImprimer />
      <FichePlan
        titre={plan.titre}
        sousTitre={[plan.evenement?.titre, plan.evenement?.date.toLocaleDateString("fr-FR", { dateStyle: "long", timeZone: "UTC" }), plan.scene?.nom].filter(Boolean).join(" · ")}
        largeur={plan.largeurCm}
        profondeur={plan.profondeurCm}
        elements={lireElements(plan.elements)}
        notes={plan.notes}
      />
    </div>
  );
}
