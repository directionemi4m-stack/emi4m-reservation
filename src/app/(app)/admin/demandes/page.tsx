import { db } from "@/lib/db";
import { LigneAction } from "@/components/admin/LigneAction";

function formatterDate(date: Date) {
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function formatterHeure(date: Date) {
  return date.toISOString().slice(11, 16);
}

export default async function AdminDemandesPage() {
  const lignes = await db.demandeCreneau.findMany({
    where: { statut: "EN_ATTENTE" },
    include: {
      demande: { include: { prof: true } },
      salle: { include: { commune: true } },
    },
    orderBy: [{ date: "asc" }, { heureDebut: "asc" }],
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-brand-slate">Demandes à traiter</h1>

      {lignes.length === 0 && (
        <p className="text-sm text-slate-500">Aucune demande en attente.</p>
      )}

      {lignes.map((ligne) => (
        <div
          key={ligne.id}
          className="flex items-start justify-between gap-4 rounded-lg bg-white p-4 shadow-sm"
        >
          <div>
            <p className="text-sm font-medium text-slate-700">
              {ligne.demande.prof.prenom} {ligne.demande.prof.nom}
              <span className="ml-2 text-xs font-normal text-slate-400">
                {ligne.demande.prof.email}
              </span>
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {ligne.salle.commune.nom} — {ligne.salle.nom}
            </p>
            <p className="text-sm text-slate-500">
              {formatterDate(ligne.date)} · {formatterHeure(ligne.heureDebut)}–
              {formatterHeure(ligne.heureFin)}
            </p>
          </div>
          <LigneAction id={ligne.id} />
        </div>
      ))}
    </div>
  );
}
