import { db } from "@/lib/db";
import { AjouterCreneauRecurrentForm } from "@/components/admin/AjouterCreneauRecurrentForm";
import { LigneCreneauRecurrent } from "@/components/admin/LigneCreneauRecurrent";

function formatterHeure(date: Date) {
  return date.toISOString().slice(11, 16);
}

const LIBELLE_JOUR: Record<string, string> = {
  LUNDI: "Lundi",
  MARDI: "Mardi",
  MERCREDI: "Mercredi",
  JEUDI: "Jeudi",
  VENDREDI: "Vendredi",
  SAMEDI: "Samedi",
  DIMANCHE: "Dimanche",
};

const ORDRE_JOUR: Record<string, number> = {
  LUNDI: 0,
  MARDI: 1,
  MERCREDI: 2,
  JEUDI: 3,
  VENDREDI: 4,
  SAMEDI: 5,
  DIMANCHE: 6,
};

export default async function AdminCreneauxRecurrentsPage({
  searchParams,
}: {
  searchParams: Promise<{ modifier?: string }>;
}) {
  const { modifier } = await searchParams;

  // On garde aussi le prof / la salle d'un créneau existant même s'ils ne figurent plus
  // dans les listes « normales » (compte direction, salle désactivée), pour pouvoir l'éditer.
  const [profs, salles, creneaux] = await Promise.all([
    db.user.findMany({
      where: { OR: [{ role: "PROF" }, { creneauxRecurrents: { some: { actif: true } } }] },
      orderBy: [{ nom: "asc" }],
    }),
    db.salle.findMany({
      where: { OR: [{ actif: true }, { creneauxRecurrents: { some: { actif: true } } }] },
      include: { commune: true },
      orderBy: [{ commune: { nom: "asc" } }, { nom: "asc" }],
    }),
    db.creneauRecurrent.findMany({
      where: { actif: true },
      include: { prof: true, salle: { include: { commune: true } } },
    }),
  ]);

  const parProf = new Map<string, typeof creneaux>();
  for (const c of creneaux) {
    const liste = parProf.get(c.profId) ?? [];
    liste.push(c);
    parProf.set(c.profId, liste);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-brand-slate">Emploi du temps de base</h1>

      <AjouterCreneauRecurrentForm profs={profs} salles={salles} />

      <div className="flex flex-col gap-4">
        {profs.map((prof) => {
          const lignes = (parProf.get(prof.id) ?? []).sort(
            (a, b) =>
              ORDRE_JOUR[a.jourSemaine] - ORDRE_JOUR[b.jourSemaine] ||
              formatterHeure(a.heureDebut).localeCompare(formatterHeure(b.heureDebut))
          );
          if (lignes.length === 0) return null;

          return (
            <div key={prof.id} className="overflow-x-auto rounded-lg bg-white p-4 shadow-sm">
              <p className="mb-3 text-sm font-semibold text-brand-slate">
                {prof.prenom} {prof.nom}
              </p>
              <table className="w-full min-w-[560px] text-left text-sm">
                <tbody>
                  {lignes.map((c) => (
                    <LigneCreneauRecurrent
                      // La clé change dès qu'une valeur change : l'éditeur se referme après
                      // l'enregistrement et repart des nouvelles valeurs.
                      key={[
                        c.id,
                        c.profId,
                        c.salleId,
                        c.jourSemaine,
                        formatterHeure(c.heureDebut),
                        formatterHeure(c.heureFin),
                        c.dateDebut.getTime(),
                        c.dateFin?.getTime() ?? "",
                      ].join("|")}
                      id={c.id}
                      jour={LIBELLE_JOUR[c.jourSemaine]}
                      horaire={`${formatterHeure(c.heureDebut)}–${formatterHeure(c.heureFin)}`}
                      salleLabel={`${c.salle.commune.nom} — ${c.salle.nom}`}
                      periode={`depuis ${c.dateDebut.toLocaleDateString("fr-FR")}${
                        c.dateFin ? ` jusqu'au ${c.dateFin.toLocaleDateString("fr-FR")}` : ""
                      }`}
                      valeurs={{
                        profId: c.profId,
                        salleId: c.salleId,
                        jourSemaine: c.jourSemaine,
                        heureDebut: formatterHeure(c.heureDebut),
                        heureFin: formatterHeure(c.heureFin),
                        dateDebut: c.dateDebut.toISOString().slice(0, 10),
                        dateFin: c.dateFin ? c.dateFin.toISOString().slice(0, 10) : "",
                      }}
                      profs={profs}
                      salles={salles}
                      ouvertParDefaut={modifier === c.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
        {creneaux.length === 0 && (
          <p className="text-sm text-slate-500">Aucun créneau récurrent défini.</p>
        )}
      </div>
    </div>
  );
}
