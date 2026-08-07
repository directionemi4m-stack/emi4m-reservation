import { db } from "@/lib/db";
import { NouvelleClasseForm } from "@/components/presences/NouvelleClasseForm";

export default async function NouvelleClassePage() {
  const [lieux, niveaux, disciplines] = await Promise.all([
    db.lieuPresence.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }),
    db.niveauFM.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }),
    db.discipline.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-xl font-semibold text-brand-slate">Nouveau cours</h1>
      <NouvelleClasseForm lieux={lieux} niveaux={niveaux} disciplines={disciplines} />
    </div>
  );
}
