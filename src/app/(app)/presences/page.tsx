import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SupprimerClasseBouton } from "@/components/presences/SupprimerClasseBouton";
import { PresencesSousNav } from "@/components/presences/PresencesSousNav";

export default async function PresencesPage() {
  const session = await auth();

  const classes = await db.classe.findMany({
    where: { profId: session!.user.id, actif: true },
    include: { eleves: true },
    orderBy: { creeLe: "desc" },
  });

  return (
    <div>
      <PresencesSousNav />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-slate">Mes cours</h1>
        <Link
          href="/presences/nouveau"
          className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90"
        >
          + Nouveau cours
        </Link>
      </div>

      {classes.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">
          Aucun cours pour l&apos;instant. Crée ton premier cours puis ajoute tes élèves.
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {classes.map((classe) => (
          <div key={classe.id} className="relative rounded-lg bg-white p-4 shadow-sm">
            <Link href={`/presences/${classe.id}`} className="flex items-center gap-3 pr-8">
              <span className="text-2xl">{classe.emoji}</span>
              <div>
                <p className="text-sm font-medium text-slate-700">{classe.nom}</p>
                <p className="text-xs text-slate-500">
                  {classe.jour ? `${classe.jour} · ` : ""}
                  {classe.eleves.length} élève{classe.eleves.length !== 1 ? "s" : ""}
                </p>
              </div>
            </Link>
            <div className="absolute right-2 top-2">
              <SupprimerClasseBouton id={classe.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
