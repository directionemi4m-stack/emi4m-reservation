import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { seanceLaPlusProche } from "@/lib/presences";
import { infoSansJour, libelleJourCours } from "@/lib/joursSemaine";
import { AjouterEleveForm } from "@/components/presences/AjouterEleveForm";
import { SupprimerEleveBouton } from "@/components/presences/SupprimerEleveBouton";
import { AjouterSeanceForm } from "@/components/presences/AjouterSeanceForm";
import { SeanceRow } from "@/components/presences/SeanceRow";
import { ModifierCoursForm } from "@/components/presences/ModifierCoursForm";

export default async function ClassePage({
  params,
}: {
  params: Promise<{ classeId: string }>;
}) {
  const { classeId } = await params;
  const session = await auth();

  const classe = await db.classe.findUnique({
    where: { id: classeId },
    include: {
      eleves: { where: { actif: true }, orderBy: { nom: "asc" } },
      seances: { orderBy: { date: "asc" }, include: { pointage: true, absenceProf: true } },
      lieu: true,
      niveauFM: true,
    },
  });

  if (!classe) notFound();
  if (classe.profId !== session!.user.id && session!.user.role !== "ADMIN") notFound();

  const [disciplines, niveaux, lieux] = await Promise.all([
    db.discipline.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }),
    db.niveauFM.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }),
    db.lieuPresence.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }),
  ]);
  // La discipline n'est pas conservée par référence sur le cours (seuls son type et son
  // nom sont copiés à la création) : on la retrouve par correspondance de nom pour
  // présélectionner le bon choix dans l'éditeur.
  const disciplineActuelle =
    classe.type === "FM"
      ? disciplines.find((d) => d.type === "FM")
      : disciplines.find((d) => d.type === "INSTRUMENT" && d.nom === classe.nom);

  const idProchaine = seanceLaPlusProche(classe.seances);
  const sousTitre =
    classe.type === "FM"
      ? [classe.niveauFM?.nom, classe.lieu?.nom, libelleJourCours(classe)].filter(Boolean).join(" · ")
      : libelleJourCours(classe);

  const derniereSeance = classe.seances[classe.seances.length - 1];
  const dateSuggeree = derniereSeance
    ? new Date(derniereSeance.date.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/presences" className="text-sm text-brand-accent hover:underline">
          ‹ Mes cours
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-brand-slate">
          {classe.emoji} {classe.nom}
        </h1>
        {sousTitre && <p className="text-sm text-slate-500">{sousTitre}</p>}
        <div className="mt-2">
          <ModifierCoursForm
            classeId={classe.id}
            jourActuel={infoSansJour(classe.jourSemaine, classe.jour)}
            jourSemaineActuel={classe.jourSemaine}
            disciplineActuelleId={disciplineActuelle?.id ?? null}
            niveauFMActuelId={classe.niveauFMId}
            lieuActuelId={classe.lieuId}
            disciplines={disciplines}
            niveaux={niveaux}
            lieux={lieux}
          />
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-brand-slate">Élèves ({classe.eleves.length})</h2>
        <ul className="mb-3 flex flex-col gap-2">
          {classe.eleves.map((eleve) => (
            <li key={eleve.id} className="flex items-center justify-between text-sm text-slate-700">
              {eleve.nom}
              <SupprimerEleveBouton classeId={classe.id} eleveId={eleve.id} />
            </li>
          ))}
          {classe.eleves.length === 0 && (
            <li className="text-sm text-slate-500">Aucun élève pour l&apos;instant.</li>
          )}
        </ul>
        <AjouterEleveForm classeId={classe.id} />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-brand-slate">{classe.seances.length} séances</h2>
        {classe.seances.map((seance, i) => (
          <SeanceRow
            key={seance.id}
            classeId={classe.id}
            seanceId={seance.id}
            date={seance.date}
            numero={i + 1}
            fait={!!seance.pointage}
            prochaine={seance.id === idProchaine}
            absence={
              seance.absenceProf
                ? {
                    type: seance.absenceProf.type,
                    dateRattrapage: seance.absenceProf.dateRattrapage,
                  }
                : null
            }
          />
        ))}
        <AjouterSeanceForm classeId={classe.id} dateSuggeree={dateSuggeree} />
      </div>
    </div>
  );
}
