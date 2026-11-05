import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { InscriptionForm } from "@/components/saison/InscriptionForm";
import { SupprimerInscriptionBouton } from "@/components/saison/SupprimerInscriptionBouton";
import { formaterDuree, minutesVersHeure } from "@/lib/agenda";
import { anneeScolaireDebut } from "@/lib/fraisRecap";
import { formaterMinutage, libelleLieu, minutageEditable } from "@/lib/saison";
import { deplacerInscription } from "../actions";
import { nomAffiche, rapprocheurAnnuaire } from "@/lib/annuaireEleves";
import { acceptePassages } from "@/lib/programmes";

const formatDateLongue = (d: Date) =>
  d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// Programme et inscriptions d'un événement de la saison (heure musicale, concert,
// audition…) : chaque prof y inscrit ses élèves avec les œuvres jouées.
export default async function ProgrammeEvenementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ modifier?: string }>;
}) {
  const { id } = await params;
  const { modifier } = await searchParams;
  const session = await auth();
  const estAdmin = session!.user.role === "ADMIN";

  const evenement = await db.evenementSaison.findUnique({
    where: { id },
    include: {
      lieu: true,
      inscriptions: {
        orderBy: [{ ordre: "asc" }, { creeLe: "asc" }],
        include: { prof: true, morceaux: { orderBy: { ordre: "asc" } } },
      },
    },
  });
  if (!evenement || !acceptePassages(evenement.type)) notFound();

  const [eleves, instruments, annuaire] = await Promise.all([
    // Suggestions : les élèves des cours de Présences du prof connecté.
    db.eleve.findMany({
      where: { actif: true, classe: { profId: session!.user.id, actif: true } },
      select: { nom: true },
      distinct: ["nom"],
      orderBy: { nom: "asc" },
    }),
    db.discipline.findMany({ where: { actif: true, type: "INSTRUMENT" }, select: { nom: true }, orderBy: { nom: "asc" } }),
    db.eleveAnnuaire.findMany({ select: { nom: true, prenom: true, instruments: true }, orderBy: [{ nom: "asc" }, { prenom: "asc" }] }),
  ]);
  // Suggestions : ses propres élèves d'abord, puis tous ceux de l'annuaire (avec leur instrument).
  const retrouver = rapprocheurAnnuaire(annuaire);
  const siens = eleves.map((e) => ({ nom: e.nom, fiche: retrouver(e.nom)?.eleve }));
  const dejaProposes = new Set(siens.map((e) => e.fiche));
  const suggestionsEleves = [
    ...siens.map((e) => ({ nom: e.nom, instrument: e.fiche?.instruments[0] })),
    ...annuaire.filter((e) => !dejaProposes.has(e)).map((e) => ({ nom: nomAffiche(e), instrument: e.instruments[0] })),
  ];

  const inscriptions = evenement.inscriptions;
  const peutModifier = (i: (typeof inscriptions)[number]) => estAdmin || i.profId === session!.user.id;
  // Inscription en cours de modification : seulement la sienne (ou n'importe laquelle pour la direction).
  const enModification = inscriptions.find((i) => i.id === modifier && peutModifier(i));
  const total = inscriptions.reduce((s, i) => s + i.minutageSecondes, 0);
  const max = evenement.dureeMaxMinutes !== null ? evenement.dureeMaxMinutes * 60 : null;
  const materiel = inscriptions.filter((i) => i.materiel);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link href={`/saison?saison=${anneeScolaireDebut(evenement.date)}`} className="text-sm text-brand-accent hover:underline">
          ← Agenda de la saison
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-brand-slate">{evenement.titre}</h1>
        <p className="text-sm text-slate-600">
          {formatDateLongue(evenement.date)}
          {evenement.heureDebutMinutes !== null && ` à ${minutesVersHeure(evenement.heureDebutMinutes)}`}
        </p>
        <p className="text-sm text-slate-600">{libelleLieu(evenement.lieu?.nom, evenement.lieuPrecis) || "Lieu à préciser"}</p>
        {evenement.description && <p className="mt-1 text-sm text-slate-500">{evenement.description}</p>}
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Minutage total</p>
        <p className={`text-3xl font-semibold ${max !== null && total > max ? "text-status-occupee" : "text-brand-slate"}`}>
          {formaterMinutage(total)}
          {evenement.dureeMaxMinutes !== null && (
            <span className="text-base font-normal text-slate-500"> / {formaterDuree(evenement.dureeMaxMinutes)} prévues</span>
          )}
        </p>
        <p className="text-xs text-slate-500">
          {inscriptions.length} élève{inscriptions.length > 1 ? "s" : ""} inscrit{inscriptions.length > 1 ? "s" : ""}
          {max !== null && total > max && ` · dépasse la durée prévue de ${formaterMinutage(total - max)}`}
          {max !== null && total <= max && ` · reste ${formaterMinutage(max - total)}`}
        </p>
      </div>

      <InscriptionForm
        key={enModification?.id ?? "nouvelle"}
        evenementId={evenement.id}
        eleves={suggestionsEleves}
        instruments={instruments.map((i) => i.nom)}
        inscription={
          enModification && {
            id: enModification.id,
            eleveNom: enModification.eleveNom,
            instrument: enModification.instrument,
            morceaux: enModification.morceaux.map((m) => ({
              titre: m.titre,
              compositeur: m.compositeur,
              arrangeur: m.arrangeur ?? "",
              duree: minutageEditable(m.dureeSecondes),
            })),
            materiel: enModification.materiel ?? "",
            commentaire: enModification.commentaire ?? "",
          }
        }
      />

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-brand-slate">Programme (ordre de passage)</h2>
          {inscriptions.length > 0 && (
            <span className="flex gap-3 text-xs">
              <Link href={`/saison/${evenement.id}/programme`} className="font-medium text-brand-accent hover:underline">
                Imprimer le programme
              </Link>
              <Link href={`/saison/${evenement.id}/programme?version=presentateur`} className="font-medium text-brand-accent hover:underline">
                Feuille du présentateur
              </Link>
            </span>
          )}
        </div>
        {inscriptions.length === 0 && <p className="text-sm text-slate-500">Aucun élève inscrit pour l&apos;instant.</p>}
        {inscriptions.map((i, n) => (
          <div key={i.id} className="flex items-start justify-between gap-3 rounded-lg bg-white p-3 shadow-sm">
            <div className="flex gap-3">
              <span className="w-6 text-right text-sm font-semibold text-slate-400">{n + 1}</span>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {i.eleveNom} · {i.instrument} · {formaterMinutage(i.minutageSecondes)}
                </p>
                {i.morceaux.length > 0 ? (
                  <ul className="text-sm text-slate-600">
                    {i.morceaux.map((m) => (
                      <li key={m.id}>
                        <span className="italic">{m.titre}</span> — {m.compositeur}
                        {m.arrangeur && ` (arr. ${m.arrangeur})`}
                        <span className="text-xs text-slate-400"> · {formaterMinutage(m.dureeSecondes)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-600">{i.programme}</p>
                )}
                <p className="text-xs text-slate-500">
                  {[i.materiel && `Matériel : ${i.materiel}`, i.commentaire, `Prof : ${i.prof.prenom} ${i.prof.nom}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {estAdmin && (
                <>
                  <form action={deplacerInscription}>
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="sens" value="haut" />
                    <button type="submit" disabled={n === 0} className="text-xs text-slate-500 hover:text-brand-accent disabled:opacity-30" aria-label="Monter">
                      ▲
                    </button>
                  </form>
                  <form action={deplacerInscription}>
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="sens" value="bas" />
                    <button
                      type="submit"
                      disabled={n === inscriptions.length - 1}
                      className="text-xs text-slate-500 hover:text-brand-accent disabled:opacity-30"
                      aria-label="Descendre"
                    >
                      ▼
                    </button>
                  </form>
                </>
              )}
              {peutModifier(i) && (
                <>
                  <Link
                    href={`/saison/${evenement.id}?modifier=${i.id}`}
                    className="text-xs font-medium text-brand-accent hover:underline"
                  >
                    Modifier
                  </Link>
                  <SupprimerInscriptionBouton id={i.id} />
                </>
              )}
            </div>
          </div>
        ))}
      </section>

      {materiel.length > 0 && (
        <section className="flex flex-col gap-1 rounded-lg bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-brand-slate">Matériel à prévoir</h2>
          <ul className="text-sm text-slate-600">
            {materiel.map((i) => (
              <li key={i.id}>
                {i.materiel} <span className="text-xs text-slate-400">({i.eleveNom}, {i.instrument})</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
