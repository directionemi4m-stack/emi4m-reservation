import { db } from "@/lib/db";
import { NouvelleDemandeForm } from "@/components/demandes/NouvelleDemandeForm";

export default async function NouvelleDemandePage() {
  const salles = await db.salle.findMany({
    where: { actif: true },
    include: { commune: true },
    orderBy: [{ commune: { nom: "asc" } }, { nom: "asc" }],
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-brand-slate">Nouvelle demande</h1>
      <NouvelleDemandeForm salles={salles} />
    </div>
  );
}
