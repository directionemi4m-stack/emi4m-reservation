import Link from "next/link";
import { IconCircleCheckFilled, IconCircleDashed } from "@tabler/icons-react";
import { db } from "@/lib/db";
import { MAIL_DIRECTION, salariesDuRegistre } from "@/lib/clesServeur";
import { verifierConnexionDrive } from "@/lib/drive";
import { rapprochementListes } from "@/lib/annuaireServeur";
import {
  debutPreparation,
  debutSaison,
  ETAPES_AUTO,
  ETAPES_MANUELLES,
  finSaison,
  saisonARentrer,
  type CleEtapeAuto,
} from "@/lib/rentree";
import { basculerEtapeRentree } from "./actions";

const jour = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
// Une sauvegarde hebdomadaire réussie récemment (un dimanche manqué se voit).
const moinsDe8Jours = (d: Date) => new Date().getTime() - d.getTime() < 8 * 86400000;

// La liste de la rentrée : ce que l'appli vérifie seule (d'après ses données), et les
// quelques étapes à cocher à la main. Réservé à la direction (cf. admin/layout.tsx).
export default async function RentreePage({ searchParams }: { searchParams: Promise<{ saison?: string }> }) {
  const { saison: saisonParam } = await searchParams;
  const proposee = saisonARentrer(new Date());
  const saison = saisonParam && /^\d{4}$/.test(saisonParam) ? Number(saisonParam) : proposee;
  const [debut, fin, preparation] = [debutSaison(saison), finSaison(saison), debutPreparation(saison)];
  const libelle = `${saison}-${saison + 1}`;

  const [
    importAnnuaire,
    nbEvenements,
    nbVacances,
    nbCours,
    nbHeures,
    nbSalaries,
    nbLocations,
    registreCles,
    documents,
    invitations,
    drive,
    sauvegarde,
    faites,
    listes,
  ] = await Promise.all([
    db.importAnnuaireEleves.findFirst({ where: { importeLe: { gte: preparation } }, orderBy: { importeLe: "desc" } }),
    db.evenementSaison.count({ where: { date: { gte: debut, lt: fin } } }),
    db.periodeVacances.count({ where: { debut: { gte: debut, lt: fin } } }),
    db.classe.count({ where: { actif: true, dateDebut: { gte: new Date(Date.UTC(saison, 7, 1)), lt: fin } } }),
    db.heuresHebdoContrat.count({ where: { anneeScolaire: libelle } }),
    db.user.count({ where: salariesDuRegistre }),
    db.locationInstrument.count({ where: { anneeDebut: saison } }),
    db.registreCles.findUnique({ where: { anneeDebut: saison } }),
    db.documentASigner.findMany({
      where: { retireLe: null },
      select: {
        version: true,
        publieLe: true,
        signatures: { where: { user: { email: { not: MAIL_DIRECTION } } }, select: { version: true } },
      },
    }),
    db.user.count({ where: { actif: true, motDePasseHash: null } }),
    verifierConnexionDrive(),
    db.etatSauvegarde.findUnique({ where: { id: "singleton" } }),
    db.etapeRentree.findMany({ where: { saison } }),
    rapprochementListes(),
  ]);
  const nonTrouves = listes.inscriptions.filter((i) => !i.fiche).length;

  const aRepublier = documents.filter((d) => d.publieLe < preparation).length;
  const signaturesManquantes = documents.reduce(
    (s, d) => s + Math.max(0, nbSalaries - d.signatures.filter((x) => x.version === d.version).length),
    0
  );
  const sauvegardeRecente = !!sauvegarde?.reussieLe && moinsDe8Jours(sauvegarde.reussieLe);

  const etats: Record<CleEtapeAuto, { ok: boolean; detail: string }> = {
    annuaire: importAnnuaire
      ? { ok: true, detail: `${pluriel(importAnnuaire.nbEleves, "élève")}, importés le ${jour(importAnnuaire.importeLe)}` }
      : { ok: false, detail: "Pas encore importé pour cette saison" },
    agenda: { ok: nbEvenements > 0, detail: nbEvenements ? pluriel(nbEvenements, "événement") : "Aucun événement" },
    vacances: {
      ok: nbVacances >= 4,
      detail: nbVacances ? `${pluriel(nbVacances, "période")} enregistrée${nbVacances > 1 ? "s" : ""}` : "Pas encore synchronisées",
    },
    cours: {
      ok: nbCours > 0,
      detail: nbCours ? `${nbCours} cours créé${nbCours > 1 ? "s" : ""} pour la saison` : "Aucun cours pour la saison",
    },
    listes: {
      ok: listes.annuaire.length > 0 && listes.inscriptions.length > 0 && nonTrouves === 0,
      detail:
        listes.annuaire.length === 0
          ? "Importer d'abord l'annuaire"
          : nonTrouves
            ? `${pluriel(nonTrouves, "élève")} des listes pas trouvé${nonTrouves > 1 ? "s" : ""} dans l'annuaire`
            : "Tous les élèves des listes sont dans l'annuaire",
    },
    heures: {
      ok: nbSalaries > 0 && nbHeures >= nbSalaries,
      detail: `${nbHeures} prof${nbHeures > 1 ? "s" : ""} sur ${nbSalaries} renseigné${nbHeures > 1 ? "s" : ""}`,
    },
    locations: { ok: nbLocations > 0, detail: nbLocations ? pluriel(nbLocations, "location") : "Aucune location pour la saison" },
    cles: { ok: !!registreCles, detail: registreCles ? "Registre de la saison créé" : "Pas encore de registre pour la saison" },
    documents: {
      ok: documents.length > 0 && aRepublier === 0 && signaturesManquantes === 0,
      detail:
        documents.length === 0
          ? "Aucun document publié"
          : aRepublier > 0
            ? `${aRepublier} document${aRepublier > 1 ? "s" : ""} à republier pour la saison`
            : signaturesManquantes
              ? `${pluriel(signaturesManquantes, "signature")} en attente`
              : "Publiés pour la saison et tous signés",
    },
    comptes: {
      ok: invitations === 0,
      detail: invitations
        ? `${pluriel(invitations, "invitation")} pas encore acceptée${invitations > 1 ? "s" : ""}`
        : "Tous les comptes sont activés",
    },
    drive: { ok: drive.statut === "active", detail: drive.statut === "active" ? "Connecté" : "À reconnecter" },
    sauvegarde: {
      ok: sauvegardeRecente,
      detail: sauvegarde?.reussieLe ? `Dernière le ${jour(sauvegarde.reussieLe)}` : "Aucune sauvegarde",
    },
  };
  const cochees = new Set(faites.map((f) => f.cle));
  const total = ETAPES_AUTO.length + ETAPES_MANUELLES.length;
  const faitesNb = ETAPES_AUTO.filter((e) => etats[e.cle].ok).length + ETAPES_MANUELLES.filter((e) => cochees.has(e.cle)).length;

  const pastille = (ok: boolean) =>
    ok ? (
      <IconCircleCheckFilled size={22} className="shrink-0 text-status-dispo" aria-label="Fait" />
    ) : (
      <IconCircleDashed size={22} className="shrink-0 text-slate-300" aria-label="À faire" />
    );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold text-brand-slate">Rentrée {libelle}</h1>
        <div className="flex gap-2 text-sm">
          {[proposee - 1, proposee, proposee + 1].map((s) => (
            <Link
              key={s}
              href={`/admin/rentree?saison=${s}`}
              className={`rounded-md border px-3 py-1 ${
                s === saison ? "border-brand-accent bg-brand-accent/10 font-semibold text-brand-accent" : "border-slate-300 text-slate-600"
              }`}
            >
              {s}-{s + 1}
            </Link>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm text-slate-600">
          <strong>
            {faitesNb} étape{faitesNb > 1 ? "s" : ""} sur {total}
          </strong>{" "}
          faites. Les premières se vérifient toutes seules d&apos;après l&apos;appli ; les dernières se cochent à la main.
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-status-dispo" style={{ width: `${Math.round((faitesNb / total) * 100)}%` }} />
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-slate-100 rounded-lg bg-white shadow-sm">
        {ETAPES_AUTO.map((e) => (
          <li key={e.cle} className="flex items-start gap-3 px-4 py-3">
            {pastille(etats[e.cle].ok)}
            <div className="min-w-0 flex-1">
              <Link href={e.lien} className="text-sm font-medium text-slate-800 hover:text-brand-accent hover:underline">
                {e.titre}
              </Link>
              <p className={`text-xs ${etats[e.cle].ok ? "text-slate-500" : "text-status-attente"}`}>{etats[e.cle].detail}</p>
              <p className="text-xs text-slate-400">{e.aide}</p>
            </div>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-brand-slate">À cocher une fois fait</h2>
        <ul className="flex flex-col divide-y divide-slate-100 rounded-lg bg-white shadow-sm">
          {ETAPES_MANUELLES.map((e) => {
            const faite = cochees.has(e.cle);
            return (
              <li key={e.cle} className="flex items-start gap-3 px-4 py-3">
                <form action={basculerEtapeRentree}>
                  <input type="hidden" name="saison" value={saison} />
                  <input type="hidden" name="cle" value={e.cle} />
                  <input type="hidden" name="faite" value={(!faite).toString()} />
                  <button type="submit" aria-label={faite ? "Marquer comme à faire" : "Marquer comme fait"}>
                    {pastille(faite)}
                  </button>
                </form>
                <div className="min-w-0 flex-1">
                  <Link href={e.lien} className="text-sm font-medium text-slate-800 hover:text-brand-accent hover:underline">
                    {e.titre}
                  </Link>
                  <p className="text-xs text-slate-400">{e.aide}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
