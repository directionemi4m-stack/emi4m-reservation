import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EvenementForm } from "@/components/saison/EvenementForm";
import { SupprimerEvenementBouton } from "@/components/saison/SupprimerEvenementBouton";
import { formaterDuree, minutesVersHeure } from "@/lib/agenda";
import { anneeScolaireDebut, libelleAnneeScolaire } from "@/lib/fraisRecap";
import { formaterMinutage, grouperParMois, libelleLieu, libelleTypeEvenement } from "@/lib/saison";

const formatJour = (d: Date) =>
  d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export default async function SaisonPage({
  searchParams,
}: {
  searchParams: Promise<{ saison?: string; modifier?: string }>;
}) {
  const session = await auth();
  const estAdmin = session!.user.role === "ADMIN";
  const { saison, modifier } = await searchParams;
  const courante = anneeScolaireDebut(new Date());
  const debut = saison && /^\d{4}$/.test(saison) ? Number(saison) : courante;

  const [evenements, lieux, salles] = await Promise.all([
    db.evenementSaison.findMany({
      where: { date: { gte: new Date(Date.UTC(debut, 8, 1)), lt: new Date(Date.UTC(debut + 1, 8, 1)) } },
      include: { lieu: true, inscriptions: { select: { minutageSecondes: true } } },
    }),
    db.lieuPresence.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }),
    db.salle.findMany({ where: { actif: true }, select: { nom: true }, distinct: ["nom"], orderBy: { nom: "asc" } }),
  ]);
  const enModification = estAdmin && modifier ? await db.evenementSaison.findUnique({ where: { id: modifier } }) : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold text-brand-slate">Agenda de la saison</h1>
        <div className="flex gap-2 text-sm">
          {[courante - 1, courante, courante + 1].map((d) => (
            <Link
              key={d}
              href={`/saison?saison=${d}`}
              className={`rounded-md border px-3 py-1 ${
                d === debut ? "border-brand-accent bg-brand-accent/10 font-semibold text-brand-accent" : "border-slate-300 text-slate-600"
              }`}
            >
              {libelleAnneeScolaire(d)}
            </Link>
          ))}
        </div>
      </div>

      {estAdmin &&
        (enModification ? (
          <EvenementForm
            key={enModification.id}
            lieux={lieux}
            sallesSuggerees={salles.map((s) => s.nom)}
            urlAnnuler={`/saison?saison=${debut}`}
            evenement={{
              id: enModification.id,
              type: enModification.type,
              titre: enModification.titre,
              date: enModification.date.toISOString().slice(0, 10),
              heureDebut: enModification.heureDebutMinutes !== null ? minutesVersHeure(enModification.heureDebutMinutes, ":") : "",
              lieuId: enModification.lieuId ?? "",
              lieuPrecis: enModification.lieuPrecis ?? "",
              description: enModification.description ?? "",
              dureeMaxMinutes: enModification.dureeMaxMinutes,
            }}
          />
        ) : (
          <EvenementForm lieux={lieux} sallesSuggerees={salles.map((s) => s.nom)} />
        ))}

      {grouperParMois(evenements, debut).map((mois) => (
        <section key={mois.libelle} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-brand-slate">{mois.libelle}</h2>
          {mois.evenements.length === 0 && <p className="text-xs text-slate-400">Aucun événement.</p>}
          {mois.evenements.map((e) => {
            const estHM = e.type === "HEURE_MUSICALE";
            const total = e.inscriptions.reduce((s, i) => s + i.minutageSecondes, 0);
            const depasse = estHM && e.dureeMaxMinutes !== null && total > e.dureeMaxMinutes * 60;
            return (
              <div key={e.id} className="flex flex-col gap-1 rounded-lg bg-white p-3 shadow-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700">
                    {formatJour(e.date)}
                    {e.heureDebutMinutes !== null && ` · ${minutesVersHeure(e.heureDebutMinutes)}`} · {e.titre}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      estHM ? "bg-brand-accent/10 text-brand-accent" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {libelleTypeEvenement(e.type)}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{libelleLieu(e.lieu?.nom, e.lieuPrecis) || "Lieu à préciser"}</p>
                {e.description && <p className="text-xs text-slate-600">{e.description}</p>}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {estHM ? (
                    <Link href={`/saison/${e.id}`} className="text-sm font-medium text-brand-accent hover:underline">
                      Programme et inscriptions ({e.inscriptions.length} élève{e.inscriptions.length > 1 ? "s" : ""} ·{" "}
                      <span className={depasse ? "text-status-occupee" : ""}>
                        {formaterMinutage(total)}
                        {e.dureeMaxMinutes !== null && ` / ${formaterDuree(e.dureeMaxMinutes)}`}
                      </span>
                      ) →
                    </Link>
                  ) : (
                    <span />
                  )}
                  {estAdmin && (
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/saison?saison=${debut}&modifier=${e.id}`}
                        className="text-xs font-medium text-brand-accent hover:underline"
                      >
                        Modifier
                      </Link>
                      <SupprimerEvenementBouton id={e.id} nbInscrits={e.inscriptions.length} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
