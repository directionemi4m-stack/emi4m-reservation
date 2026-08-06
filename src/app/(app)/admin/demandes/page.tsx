import { db } from "@/lib/db";
import { LigneAction } from "@/components/admin/LigneAction";
import { LigneAnnulation } from "@/components/admin/LigneAnnulation";

function formatterDate(date: Date) {
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function formatterHeure(date: Date) {
  return date.toISOString().slice(11, 16);
}

function aujourdHuiUTC(): Date {
  const maintenant = new Date();
  return new Date(
    Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate())
  );
}

export default async function AdminDemandesPage() {
  const [enAttente, validees] = await Promise.all([
    db.demandeCreneau.findMany({
      where: { statut: "EN_ATTENTE" },
      include: {
        demande: { include: { prof: true } },
        salle: { include: { commune: true } },
      },
      orderBy: [{ date: "asc" }, { heureDebut: "asc" }],
    }),
    db.demandeCreneau.findMany({
      where: { statut: "VALIDEE", date: { gte: aujourdHuiUTC() } },
      include: {
        demande: { include: { prof: true } },
        salle: { include: { commune: true } },
      },
      orderBy: [{ date: "asc" }, { heureDebut: "asc" }],
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-brand-slate">Demandes à traiter</h1>

        {enAttente.length === 0 && (
          <p className="text-sm text-slate-500">Aucune demande en attente.</p>
        )}

        {enAttente.map((ligne) => (
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

      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-brand-slate">Réservations validées à venir</h2>
          <p className="text-sm text-slate-500">
            Annulez une réservation déjà validée pour libérer la salle sur le planning.
          </p>
        </div>

        {validees.length === 0 && (
          <p className="text-sm text-slate-500">Aucune réservation validée à venir.</p>
        )}

        {validees.map((ligne) => (
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
            <LigneAnnulation id={ligne.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
