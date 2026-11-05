import Link from "next/link";
import { notFound } from "next/navigation";
import { IconLock, IconMail, IconMapPin, IconPhone } from "@tabler/icons-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { nomAffiche, rapprocheurAnnuaire } from "@/lib/annuaireEleves";
import { rapprochementListes } from "@/lib/annuaireServeur";
import { LIBELLE_AUTORISATION, LIBELLE_INTERCOURS } from "@/lib/cham";
import { libelleCaution, libelleSaison } from "@/lib/locations";
import { libellePeriode } from "@/lib/bulletinsCham";
import { formaterMinutage } from "@/lib/saison";

const dateCourte = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function Section({ titre, direction = false, children }: { titre: string; direction?: boolean; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-brand-slate">
        {titre}
        {direction && (
          <span className="inline-flex items-center gap-0.5 text-xs font-normal text-slate-400">
            <IconLock size={12} aria-hidden /> direction
          </span>
        )}
      </h2>
      {children}
    </section>
  );
}

// La fiche d'un élève : tout ce que l'appli sait de lui, rassemblé depuis l'annuaire, les
// listes d'appel, les heures musicales, les locations et le suivi CHAM. Les présences d'un
// cours ne sont montrées qu'à son prof et à la direction ; locations et bulletins CHAM
// sont réservés à la direction.
export default async function FicheElevePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;
  const estAdmin = session!.user.role === "ADMIN";

  const { annuaire, inscriptions } = await rapprochementListes();
  const eleve = annuaire.find((e) => e.id === id);
  if (!eleve) notFound();
  const retrouver = rapprocheurAnnuaire(annuaire);
  const estLui = (nom: string, contexte = "") => retrouver(nom, contexte)?.eleve.id === id;

  const sesCours = inscriptions.filter((i) => i.fiche?.id === id);
  const coursVisibles = sesCours.filter((i) => estAdmin || i.classe.prof.id === userId);

  const [marques, passages, locations, cham] = await Promise.all([
    db.presenceMarque.findMany({
      where: { eleveId: { in: coursVisibles.map((i) => i.eleve.id) } },
      select: { eleveId: true, statut: true, pointage: { select: { seance: { select: { date: true } } } } },
    }),
    db.inscriptionHeureMusicale.findMany({
      select: {
        id: true,
        eleveNom: true,
        instrument: true,
        programme: true,
        minutageSecondes: true,
        evenement: { select: { id: true, titre: true, date: true } },
      },
      orderBy: { evenement: { date: "desc" } },
    }),
    estAdmin ? db.locationInstrument.findMany({ orderBy: { anneeDebut: "desc" } }) : Promise.resolve([]),
    db.eleveCham.findMany({ include: { bulletins: { orderBy: [{ anneeDebut: "desc" }, { trimestre: "desc" }] } } }),
  ]);

  const sesPassages = passages.filter((p) => estLui(p.eleveNom, p.instrument));
  const sesLocations = locations.filter((l) => estLui(`${l.prenom} ${l.nom}`, l.instrument));
  const ficheCham = cham.find((c) => estLui(`${c.prenom} ${c.nom}`));

  const presencesDe = (eleveId: string) => {
    const m = marques.filter((x) => x.eleveId === eleveId);
    return {
      present: m.filter((x) => x.statut === "PRESENT").length,
      excuse: m.filter((x) => x.statut === "EXCUSE").length,
      absent: m.filter((x) => x.statut === "ABSENT").length,
      absences: m
        .filter((x) => x.statut !== "PRESENT")
        .map((x) => ({ date: x.pointage.seance.date, statut: x.statut }))
        .sort((a, b) => b.date.getTime() - a.date.getTime()),
    };
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <Link href="/annuaire/eleves" className="text-sm text-brand-accent hover:underline">
          ‹ Annuaire des élèves
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-brand-slate">{nomAffiche(eleve)}</h1>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
          {eleve.instruments.join(", ") || "Instrument non renseigné"}
          {eleve.commune && (
            <span className="inline-flex items-center gap-0.5">
              <IconMapPin size={14} aria-hidden /> {eleve.commune}
            </span>
          )}
        </p>
      </div>

      <Section titre="Coordonnées de la famille">
        {eleve.telephones.length + eleve.emails.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune coordonnée dans le fichier des inscriptions.</p>
        ) : (
          <div className="flex flex-col gap-1 text-sm">
            {eleve.telephones.map((t) => (
              <a key={t} href={`tel:${t.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1 text-brand-accent hover:underline">
                <IconPhone size={14} aria-hidden /> {t}
              </a>
            ))}
            {eleve.emails.map((m) => (
              <a key={m} href={`mailto:${m}`} className="inline-flex items-center gap-1 break-all text-brand-accent hover:underline">
                <IconMail size={14} className="shrink-0" aria-hidden /> {m}
              </a>
            ))}
          </div>
        )}
      </Section>

      <Section titre={`Cours suivis (${sesCours.length})`}>
        {sesCours.length === 0 ? (
          <p className="text-sm text-slate-500">Dans aucune liste d&apos;appel pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sesCours.map((i) => {
              const voit = estAdmin || i.classe.prof.id === userId;
              const p = voit ? presencesDe(i.eleve.id) : null;
              const total = p ? p.present + p.excuse + p.absent : 0;
              return (
                <li key={`${i.classe.id}-${i.eleve.id}`} className="flex flex-col gap-1 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    {voit ? (
                      <Link href={`/presences/${i.classe.id}`} className="font-medium text-slate-800 hover:text-brand-accent hover:underline">
                        {i.classe.emoji} {i.classe.nom}
                      </Link>
                    ) : (
                      <span className="font-medium text-slate-800">
                        {i.classe.emoji} {i.classe.nom}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      {i.classe.prof.prenom} {i.classe.prof.nom}
                      {i.approche && ` · noté « ${i.eleve.nom} »`}
                    </span>
                  </div>
                  {p &&
                    (total === 0 ? (
                      <p className="text-xs text-slate-400">Pas encore d&apos;appel enregistré.</p>
                    ) : (
                      <p className="text-xs text-slate-600">
                        <span className="text-status-dispo">{p.present} présent{p.present > 1 ? "s" : ""}</span> ·{" "}
                        <span className="text-status-attente">{p.excuse} excusé{p.excuse > 1 ? "s" : ""}</span> ·{" "}
                        <span className="text-status-occupee">{p.absent} absent{p.absent > 1 ? "s" : ""}</span> sur {total} séances
                        {p.absences.length > 0 &&
                          ` — absences : ${p.absences
                            .slice(0, 6)
                            .map((a) => `${dateCourte(a.date)}${a.statut === "EXCUSE" ? " (excusé)" : ""}`)
                            .join(", ")}${p.absences.length > 6 ? "…" : ""}`}
                      </p>
                    ))}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section titre={`Heures musicales (${sesPassages.length})`}>
        {sesPassages.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun passage enregistré.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100 text-sm">
            {sesPassages.map((p) => (
              <li key={p.id} className="flex flex-col py-1.5">
                <Link href={`/saison/${p.evenement.id}`} className="font-medium text-slate-800 hover:text-brand-accent hover:underline">
                  {p.evenement.titre} · {dateCourte(p.evenement.date)}
                </Link>
                <span className="text-xs text-slate-500">
                  {p.instrument} · {p.programme} · {formaterMinutage(p.minutageSecondes)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {ficheCham && (
        <Section titre="CHAM">
          <p className="text-sm text-slate-600">
            Sortie entre deux cours : <strong>{LIBELLE_INTERCOURS[ficheCham.autorisationIntercours]}</strong> · Sortie à 16h30 :{" "}
            <strong>{LIBELLE_AUTORISATION[ficheCham.autorisationSortie16h30]}</strong>
            {ficheCham.precisionsSortie && ` (${ficheCham.precisionsSortie})`}
          </p>
          {estAdmin && (
            <div className="text-sm">
              <p className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                <IconLock size={12} aria-hidden /> Bulletins (direction)
              </p>
              {ficheCham.bulletins.length === 0 ? (
                <p className="text-xs text-slate-500">Aucun bulletin pour l&apos;instant.</p>
              ) : (
                <ul className="text-xs text-slate-600">
                  {ficheCham.bulletins.map((b) => (
                    <li key={b.id}>
                      {libellePeriode(b.anneeDebut, b.trimestre)} :{" "}
                      {b.envoyeLe ? `envoyé à la famille le ${dateCourte(b.envoyeLe)}` : b.signeDirectionLe ? "signé, pas encore envoyé" : "en cours"}
                    </li>
                  ))}
                </ul>
              )}
              <Link href={`/bulletins-cham/${ficheCham.id}`} className="text-xs text-brand-accent hover:underline">
                Ouvrir les bulletins
              </Link>
            </div>
          )}
        </Section>
      )}

      {estAdmin && (
        <Section titre={`Location d'instrument (${sesLocations.length})`} direction>
          {sesLocations.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune location.</p>
          ) : (
            <ul className="flex flex-col text-sm">
              {sesLocations.map((l) => (
                <li key={l.id} className="flex flex-wrap justify-between gap-x-2 py-1">
                  <span>
                    {libelleSaison(l.anneeDebut)} · {l.instrument}
                  </span>
                  <span className={`text-xs ${l.paye ? "text-status-dispo" : "text-status-occupee"}`}>
                    {l.paye ? "Payée" : "Non payée"} · caution {libelleCaution(l.caution).toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/locations" className="text-xs text-brand-accent hover:underline">
            Toutes les locations
          </Link>
        </Section>
      )}
    </div>
  );
}
