import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatutBadge } from "@/components/demandes/StatutBadge";
import { SupprimerLigneAdmin } from "@/components/demandes/SupprimerLigneAdmin";

function formatterDate(date: Date) {
  return date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

function formatterHeure(date: Date) {
  return date.toISOString().slice(11, 16);
}

export default async function MesDemandesPage() {
  const session = await auth();

  const estAdmin = session!.user.role === "ADMIN";

  const demandes = await db.demande.findMany({
    where: { profId: session!.user.id },
    include: {
      salle: { include: { commune: true } },
      creneaux: { include: { salle: { include: { commune: true } } } },
    },
    orderBy: { creeLe: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-slate">Mes demandes</h1>
        <Link
          href="/demandes/nouvelle"
          className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90"
        >
          Nouvelle demande
        </Link>
      </div>

      {demandes.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">Vous n&apos;avez pas encore déposé de demande.</p>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {demandes.map((demande) => (
          <div key={demande.id} className="rounded-lg bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-medium text-slate-600">
              {demande.salle.commune.nom} — {demande.salle.nom}
            </div>
            <ul className="flex flex-col gap-2">
              {demande.creneaux.map((creneau) => (
                <li key={creneau.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">
                    {formatterDate(creneau.date)} · {formatterHeure(creneau.heureDebut)}–
                    {formatterHeure(creneau.heureFin)}
                    {/* Réservation déplacée dans une autre salle par la direction */}
                    {creneau.salleId !== demande.salleId && (
                      <span className="ml-2 text-xs text-brand-accent">
                        → {creneau.salle.commune.nom} — {creneau.salle.nom}
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-3">
                    {(creneau.statut === "REFUSEE" || creneau.statut === "ANNULEE") &&
                      (creneau.creneauBloquant || creneau.motifRefus) && (
                      <span className="text-xs text-slate-400">
                        {creneau.creneauBloquant ?? creneau.motifRefus}
                      </span>
                    )}
                    <StatutBadge statut={creneau.statut} />
                    {estAdmin && <SupprimerLigneAdmin id={creneau.id} />}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
