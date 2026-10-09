import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AjouterCreneauForm } from "@/components/agenda/AjouterCreneauForm";
import { SupprimerCreneauBouton } from "@/components/agenda/SupprimerCreneauBouton";
import { SelecteurProfCible } from "@/components/admin/SelecteurProfCible";
import { formaterDuree, heuresDecimales, minutesHebdo, minutesVersHeure, volumeHebdoMinutes } from "@/lib/agenda";
import { JOURS_SEMAINE_OPTIONS } from "@/lib/joursSemaine";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ profId?: string }>;
}) {
  const session = await auth();
  const estAdmin = session!.user.role === "ADMIN";
  const { profId: profIdParam } = await searchParams;
  const profIdCible = estAdmin && profIdParam ? profIdParam : session!.user.id;
  const gereCollegue = profIdCible !== session!.user.id;

  const [creneaux, lieux, salles, eleves, profs, profCible] = await Promise.all([
    db.creneauAgenda.findMany({
      where: { profId: profIdCible },
      // L'enum JourSemaine se trie dans son ordre de déclaration (lundi → dimanche).
      orderBy: [{ jourSemaine: "asc" }, { heureDebutMinutes: "asc" }],
      include: { lieu: true, salle: true },
    }),
    db.lieuPresence.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }),
    db.salle.findMany({
      where: { actif: true },
      include: { commune: true },
      orderBy: [{ commune: { nom: "asc" } }, { nom: "asc" }],
    }),
    // Suggestions : les élèves déjà inscrits dans les cours de Présences du prof.
    db.eleve.findMany({
      where: { actif: true, classe: { profId: profIdCible, actif: true } },
      select: { nom: true },
      distinct: ["nom"],
      orderBy: { nom: "asc" },
    }),
    estAdmin ? db.user.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }) : Promise.resolve([]),
    gereCollegue ? db.user.findUnique({ where: { id: profIdCible } }) : Promise.resolve(null),
  ]);

  const total = volumeHebdoMinutes(creneaux);
  const nbUneSurDeux = creneaux.filter((c) => c.uneSemaineSurDeux).length;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold text-brand-slate">
          {profCible ? `Emploi du temps de ${profCible.prenom} ${profCible.nom}` : "Mon emploi du temps"}
        </h1>
        {estAdmin && <SelecteurProfCible profs={profs} profIdActuel={profIdCible} moiId={session!.user.id} />}
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Volume horaire hebdomadaire</p>
        <p className="text-3xl font-semibold text-brand-slate">{formaterDuree(total)}</p>
        <p className="text-xs text-slate-500">
          {creneaux.length} cours · {heuresDecimales(total)} h
          {nbUneSurDeux > 0 && ` · dont ${nbUneSurDeux} une semaine sur deux, comptés pour moitié`}
        </p>
      </div>

      <AjouterCreneauForm
        lieux={lieux}
        salles={salles.map((s) => ({ id: s.id, nom: s.nom, communeNom: s.commune.nom }))}
        suggestions={eleves.map((e) => e.nom)}
        profIdCible={gereCollegue ? profIdCible : undefined}
      />

      {creneaux.length === 0 && (
        <p className="text-sm text-slate-500">Aucun cours saisi pour l&apos;instant.</p>
      )}

      {JOURS_SEMAINE_OPTIONS.map((jour) => {
        const duJour = creneaux.filter((c) => c.jourSemaine === jour.valeur);
        if (duJour.length === 0) return null;
        return (
          <section key={jour.valeur} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-brand-slate">{jour.label}</h2>
              <p className="text-xs text-slate-500">{formaterDuree(volumeHebdoMinutes(duJour))}</p>
            </div>
            {duJour.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {minutesVersHeure(c.heureDebutMinutes)}–{minutesVersHeure(c.heureDebutMinutes + c.dureeMinutes)} ·{" "}
                    {c.nom}
                  </p>
                  <p className="text-xs text-slate-500">
                    {[
                      c.type === "INDIVIDUEL" ? "Individuel" : "Collectif",
                      `${c.dureeMinutes} min`,
                      c.lieu?.nom,
                      c.salle && `salle ${c.salle.nom}`,
                      c.uneSemaineSurDeux ? `1 semaine sur 2 (compte ${formaterDuree(minutesHebdo(c))})` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <SupprimerCreneauBouton id={c.id} />
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
