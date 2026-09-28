import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AjouterActiviteForm } from "@/components/activite-accessoire/AjouterActiviteForm";
import { SupprimerActiviteBouton } from "@/components/activite-accessoire/SupprimerActiviteBouton";
import { SelecteurProfCible } from "@/components/admin/SelecteurProfCible";

function formatterDate(date: Date) {
  return date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

function cleMois(date: Date) {
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export default async function ActiviteAccessoirePage({
  searchParams,
}: {
  searchParams: Promise<{ profId?: string }>;
}) {
  const session = await auth();
  const estAdmin = session!.user.role === "ADMIN";
  const { profId: profIdParam } = await searchParams;
  const profIdCible = estAdmin && profIdParam ? profIdParam : session!.user.id;
  const gereColleague = profIdCible !== session!.user.id;

  const [typesEvenement, activites, profs, profCible] = await Promise.all([
    db.typeEvenementAccessoire.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }),
    db.activiteAccessoire.findMany({
      where: { profId: profIdCible, supprimeLe: null },
      orderBy: { date: "desc" },
    }),
    estAdmin ? db.user.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }) : Promise.resolve([]),
    gereColleague ? db.user.findUnique({ where: { id: profIdCible } }) : Promise.resolve(null),
  ]);

  const groupes = new Map<string, typeof activites>();
  for (const activite of activites) {
    const cle = cleMois(activite.date);
    const liste = groupes.get(cle) ?? [];
    liste.push(activite);
    groupes.set(cle, liste);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-brand-slate">
          {profCible ? `Activité accessoire de ${profCible.prenom} ${profCible.nom}` : "Mon activité accessoire"}
        </h1>
        {estAdmin && (
          <SelecteurProfCible profs={profs} profIdActuel={profIdCible} moiId={session!.user.id} />
        )}
      </div>

      {profCible && (
        <p className="rounded-md bg-brand-accent/10 px-3 py-2 text-sm text-brand-accent">
          Vous gérez l&apos;activité accessoire de {profCible.prenom} {profCible.nom}.
        </p>
      )}

      <AjouterActiviteForm typesEvenement={typesEvenement} profIdCible={gereColleague ? profIdCible : undefined} />

      {activites.length === 0 && (
        <p className="text-sm text-slate-500">Aucune activité déclarée pour l&apos;instant.</p>
      )}

      {Array.from(groupes.entries()).map(([mois, lignes]) => (
        <div key={mois} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold capitalize text-brand-slate">{mois}</h2>
          <div className="flex flex-col gap-2">
            {lignes.map((activite) => (
              <div
                key={activite.id}
                className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {formatterDate(activite.date)} · {activite.typeEvenementNom}
                  </p>
                  <p className="text-xs text-slate-500">{activite.duree}</p>
                </div>
                <SupprimerActiviteBouton id={activite.id} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
