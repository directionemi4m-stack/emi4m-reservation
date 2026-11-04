import Link from "next/link";
import { db } from "@/lib/db";
import { aujourdHuiUTC, LIBELLES_RESERVATION } from "@/lib/conventions";
import { ConventionReservation } from "@/components/admin/ConventionReservation";
import { BoutonRegistreConventions } from "@/components/admin/BoutonRegistreConventions";
import { evenementsAConvention } from "@/lib/conventionsServeur";
import { minutesVersHeure } from "@/lib/agenda";
import { libelleLieu } from "@/lib/saison";
import { ajouterConventionEvenement } from "./actions";

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const heure = (d: Date) => d.toISOString().slice(11, 16);
const dateLongue = (d: Date) => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// Toutes les conventions signées avec les mairies (La Coupole, La Verrière, salle des fêtes
// de Méaudre…), à venir puis passées. Réservé à la direction (cf. admin/layout.tsx) ; les
// scans et le registre sont dans le Drive, dossier « Conventions de réservation ».
export default async function ConventionsPage() {
  const aujourdHui = aujourdHuiUTC();
  const [conventions, sansConvention, registre, salles, evenements, autresEvenements] = await Promise.all([
    db.conventionSalle.findMany({
      include: { demandeCreneau: { select: { statut: true } } },
      orderBy: [{ date: "desc" }, { horaire: "desc" }],
    }),
    // Réservations à venir d'une salle à convention, pour lesquelles rien n'est encore noté.
    db.demandeCreneau.findMany({
      where: { statut: { in: ["EN_ATTENTE", "VALIDEE"] }, date: { gte: aujourdHui }, salle: { conventionRequise: true }, convention: null },
      include: { salle: { include: { commune: true } }, demande: { include: { prof: true } } },
      orderBy: [{ date: "asc" }, { heureDebut: "asc" }],
    }),
    db.registreConventions.findUnique({ where: { id: "singleton" } }),
    db.salle.findMany({ where: { conventionRequise: true }, include: { commune: true }, orderBy: { nom: "asc" } }),
    evenementsAConvention(),
    db.evenementSaison.findMany({ where: { date: { gte: aujourdHui }, convention: { is: null } }, include: { lieu: true }, orderBy: { date: "asc" } }),
  ]);
  const idsEvenements = new Set(evenements.map((e) => e.id));
  const ajoutables = autresEvenements.filter((e) => !idsEvenements.has(e.id));

  const fiches = [
    ...sansConvention.map((l) => ({
      cle: l.id,
      date: l.date,
      horaire: `${heure(l.heureDebut)}–${heure(l.heureFin)}`,
      salle: l.salle.nom,
      commune: l.salle.commune.nom,
      prof: `${l.demande.prof.prenom} ${l.demande.prof.nom}`,
      statut: LIBELLES_RESERVATION[l.statut],
      convention: { demandeCreneauId: l.id, demandeMairieLe: null, reponseMairieLe: null, commentaire: null, fichierUrl: null },
    })),
    // Événements de l'agenda dans une salle à convention, sans fiche encore.
    ...evenements
      .filter((e) => !e.convention)
      .map((e) => ({
        cle: e.id,
        date: e.date,
        horaire: e.heureDebutMinutes !== null ? minutesVersHeure(e.heureDebutMinutes, ":") : "",
        salle: e.lieuPrecis ?? "",
        commune: e.lieu?.nom ?? "",
        prof: `Agenda : ${e.titre}`,
        statut: "Agenda de la saison",
        convention: { evenementSaisonId: e.id, demandeMairieLe: null, reponseMairieLe: null, commentaire: null, fichierUrl: null },
      })),
    ...conventions.map((c) => ({
      cle: c.id,
      date: c.date,
      horaire: c.horaire,
      salle: c.salle,
      commune: c.commune,
      prof: c.prof,
      statut: c.demandeCreneau ? LIBELLES_RESERVATION[c.demandeCreneau.statut] : c.evenementSaisonId ? "Agenda de la saison" : "Supprimée",
      convention: {
        conventionId: c.id,
        demandeMairieLe: iso(c.demandeMairieLe),
        reponseMairieLe: iso(c.reponseMairieLe),
        commentaire: c.commentaire,
        fichierUrl: c.fichierUrl,
      },
    })),
  ];
  const aVenir = fiches.filter((f) => f.date >= aujourdHui).sort((a, b) => a.date.getTime() - b.date.getTime() || a.horaire.localeCompare(b.horaire));
  const passees = fiches.filter((f) => f.date < aujourdHui);

  const carte = (f: (typeof fiches)[number]) => (
    <div key={f.cle} className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">
          {[f.commune, f.salle].filter(Boolean).join(" — ")}
        </p>
        <span className="text-xs text-slate-400">{f.statut === "Agenda de la saison" || f.statut === "Supprimée" ? f.statut : `Réservation ${f.statut.toLowerCase()}`}</span>
      </div>
      <p className="text-sm text-slate-500">
        {[dateLongue(f.date), f.horaire, f.prof.replace(/^Agenda : /, "")].filter(Boolean).join(" · ")}
      </p>
      <ConventionReservation convention={f.convention} />
    </div>
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-brand-slate">Conventions des salles</h1>
        <p className="text-sm text-slate-500">
          Salles prêtées contre une convention signée avec la mairie :{" "}
          {salles.map((s) => `${s.nom} (${s.commune.nom})`).join(", ") || "aucune"}. Les réservations et les événements
          de l&apos;agenda de la saison prévus dans ces salles apparaissent ici. La date de demande est notée toute seule
          quand vous envoyez la « Demande à la mairie » depuis{" "}
          <Link href="/admin/demandes" className="text-brand-accent hover:underline">
            À traiter
          </Link>
          . Les scans et le registre sont rangés dans le Drive, dossier « Conventions de réservation ». Les profs n&apos;y ont
          pas accès. Pour changer la liste des salles concernées :{" "}
          <Link href="/admin/parametres/salles" className="text-brand-accent hover:underline">
            Paramètres › Salles
          </Link>
          .
        </p>
        <BoutonRegistreConventions url={registre?.url ?? null} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-brand-slate">À venir</h2>
        {aVenir.length === 0 ? <p className="text-sm text-slate-500">Aucune réservation ni aucun événement à venir dans ces salles.</p> : aVenir.map(carte)}
        {ajoutables.length > 0 && (
          <form action={ajouterConventionEvenement} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">Convention pour un autre événement de l&apos;agenda :</span>
            <select name="evenementSaisonId" required defaultValue="" className="max-w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="" disabled>
                Choisir…
              </option>
              {ajoutables.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" })} · {e.titre}
                  {libelleLieu(e.lieu?.nom, e.lieuPrecis) ? ` (${libelleLieu(e.lieu?.nom, e.lieuPrecis)})` : ""}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
              Ajouter
            </button>
          </form>
        )}
      </section>

      {passees.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-brand-slate">Passées</h2>
          {passees.map(carte)}
        </section>
      )}
    </div>
  );
}
