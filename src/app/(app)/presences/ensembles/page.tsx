import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { PresencesSousNav } from "@/components/presences/PresencesSousNav";
import { joursFeries, estFerie } from "@/lib/joursFeries";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const debutDuJour = () => {
  const m = new Date();
  return new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate()));
};
const jour = (d: Date) => d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" });

// Toutes les dates à venir des ensembles (chorale, orchestres…), sur une seule page : pour
// les profs et pour anticiper salles et concerts.
export default async function AgendaDesEnsemblesPage() {
  const session = await auth();
  const aujourdHui = debutDuJour();
  const [seances, feries] = await Promise.all([
    db.seance.findMany({
      where: { date: { gte: aujourdHui }, classe: { actif: true, agendaLibre: true } },
      include: { classe: { include: { prof: { select: { id: true, prenom: true, nom: true } }, lieu: true } } },
      orderBy: [{ date: "asc" }],
    }),
    joursFeries(),
  ]);
  const ensembles = await db.classe.findMany({
    where: { actif: true, agendaLibre: true },
    include: { prof: { select: { prenom: true, nom: true } } },
    orderBy: { nom: "asc" },
  });

  const parMois = new Map<string, typeof seances>();
  for (const s of seances) {
    const cle = `${MOIS[s.date.getUTCMonth()]} ${s.date.getUTCFullYear()}`;
    parMois.set(cle, [...(parMois.get(cle) ?? []), s]);
  }

  return (
    <div>
      <PresencesSousNav />
      <h1 className="text-xl font-semibold text-brand-slate">Agenda des ensembles</h1>
      <p className="mt-1 text-sm text-slate-500">
        Les dates à venir de tous les ensembles à agenda à la carte. Chaque prof les coche dans « Agenda de l&apos;année » de son cours.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {ensembles.map((e) => (
          <span key={e.id} className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 shadow-sm">
            {e.emoji} {e.nom} · {e.prof.prenom} {e.prof.nom}
          </span>
        ))}
        {ensembles.length === 0 && (
          <p className="text-sm text-slate-500">
            Aucun ensemble pour l&apos;instant. À la création d&apos;un cours (chorale, orchestre, ensemble, atelier), la case « agenda à la
            carte » est proposée cochée.
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-5">
        {[...parMois].map(([mois, liste]) => (
          <section key={mois} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-brand-slate">{mois}</h2>
            <ul className="flex flex-col divide-y divide-slate-100 rounded-lg bg-white shadow-sm">
              {liste.map((s) => {
                const ferie = estFerie(feries, s.date);
                const sienne = s.classe.prof.id === session!.user.id || session!.user.role === "ADMIN";
                const horaire = s.horaire ?? s.classe.jour;
                const lieu = s.lieu ?? s.classe.lieu?.nom;
                const contenu = (
                  <>
                    <span className="w-16 shrink-0 text-sm font-medium capitalize text-slate-700">{jour(s.date)}</span>
                    <span className="min-w-0 flex-1 text-sm text-slate-700">
                      {s.classe.emoji} {s.classe.nom}
                      <span className="block text-xs text-slate-500">
                        {[horaire, lieu, `${s.classe.prof.prenom} ${s.classe.prof.nom}`].filter(Boolean).join(" · ")}
                        {(s.horaire || s.lieu) && <span className="text-brand-accent"> · horaire ou lieu particulier</span>}
                      </span>
                    </span>
                    {ferie && <span className="text-xs text-status-occupee">🎌 férié</span>}
                  </>
                );
                return (
                  <li key={s.id}>
                    {sienne ? (
                      <Link href={`/presences/${s.classeId}/${s.id}`} className="flex items-start gap-3 px-4 py-2 hover:bg-slate-50">
                        {contenu}
                      </Link>
                    ) : (
                      <div className="flex items-start gap-3 px-4 py-2">{contenu}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {ensembles.length > 0 && seances.length === 0 && <p className="text-sm text-slate-500">Aucune date à venir.</p>}
      </div>
    </div>
  );
}
