import { db } from "@/lib/db";
import { AjouterCreneauRecurrentForm } from "@/components/admin/AjouterCreneauRecurrentForm";
import { desactiverCreneauRecurrent } from "./actions";

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

export default async function AdminCreneauxRecurrentsPage() {
  const [profs, salles, creneaux] = await Promise.all([
    db.user.findMany({ where: { role: "PROF" }, orderBy: [{ nom: "asc" }] }),
    db.salle.findMany({
      where: { actif: true },
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
            <div key={prof.id} className="rounded-lg bg-white p-4 shadow-sm">
              <p className="mb-3 text-sm font-semibold text-brand-slate">
                {prof.prenom} {prof.nom}
              </p>
              <table className="w-full text-left text-sm">
                <tbody>
                  {lignes.map((c) => (
                    <tr key={c.id} className="border-t border-slate-100">
                      <td className="py-2 text-slate-700">{LIBELLE_JOUR[c.jourSemaine]}</td>
                      <td className="py-2 text-slate-700">
                        {formatterHeure(c.heureDebut)}–{formatterHeure(c.heureFin)}
                      </td>
                      <td className="py-2 text-slate-600">
                        {c.salle.commune.nom} — {c.salle.nom}
                      </td>
                      <td className="py-2 text-xs text-slate-400">
                        depuis {c.dateDebut.toLocaleDateString("fr-FR")}
                        {c.dateFin ? ` jusqu'au ${c.dateFin.toLocaleDateString("fr-FR")}` : ""}
                      </td>
                      <td className="py-2 text-right">
                        <form action={desactiverCreneauRecurrent}>
                          <input type="hidden" name="id" value={c.id} />
                          <button
                            type="submit"
                            className="text-xs font-medium text-status-occupee hover:underline"
                          >
                            Désactiver
                          </button>
                        </form>
                      </td>
                    </tr>
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
