import { db } from "@/lib/db";
import { LigneAction } from "@/components/admin/LigneAction";
import { LigneAnnulation } from "@/components/admin/LigneAnnulation";
import { DemandeMailForm } from "@/components/admin/DemandeMailForm";
import { ModifierReservation } from "@/components/admin/ModifierReservation";
import { MODELE_MAIRIE_DEFAUT } from "@/lib/modeleMairie";
import Link from "next/link";
import { marquerEchecMailVu } from "./actions";
import { ConventionReservation, type ConventionVue } from "@/components/admin/ConventionReservation";

function formatterDate(date: Date) {
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function formatterHeure(date: Date) {
  return date.toISOString().slice(11, 16);
}

// Le bloc « Convention mairie » d'une ligne : seulement pour les salles à convention (ou
// une ligne qui a déjà sa convention, même si la salle a été changée depuis).
function conventionDe(ligne: {
  id: string;
  salle: { conventionRequise: boolean };
  convention: { id: string; demandeMairieLe: Date | null; reponseMairieLe: Date | null; commentaire: string | null; fichierUrl: string | null } | null;
}): ConventionVue | null {
  const c = ligne.convention;
  if (!c && !ligne.salle.conventionRequise) return null;
  const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
  return c
    ? { conventionId: c.id, demandeMairieLe: iso(c.demandeMairieLe), reponseMairieLe: iso(c.reponseMairieLe), commentaire: c.commentaire, fichierUrl: c.fichierUrl }
    : { demandeCreneauId: ligne.id, demandeMairieLe: null, reponseMairieLe: null, commentaire: null, fichierUrl: null };
}

function aujourdHuiUTC(): Date {
  const maintenant = new Date();
  return new Date(
    Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate()),
  );
}

export default async function AdminDemandesPage({
  searchParams,
}: {
  searchParams: Promise<{ modifier?: string }>;
}) {
  const { modifier } = await searchParams;
  const [enAttente, validees, contacts, salles, modeleEnregistre, echecsMail] = await Promise.all([
    db.demandeCreneau.findMany({
      where: { statut: "EN_ATTENTE" },
      include: {
        demande: { include: { prof: true } },
        salle: { include: { commune: true } },
        convention: true,
      },
      orderBy: [{ date: "asc" }, { heureDebut: "asc" }],
    }),
    db.demandeCreneau.findMany({
      where: {
        statut: "VALIDEE",
        // La réservation ciblée par un lien « Modifier » (vue jour du planning) reste
        // affichée même si elle est passée.
        OR: [{ date: { gte: aujourdHuiUTC() } }, ...(modifier ? [{ id: modifier }] : [])],
      },
      include: {
        demande: { include: { prof: true } },
        salle: { include: { commune: true } },
        convention: true,
      },
      orderBy: [{ date: "asc" }, { heureDebut: "asc" }],
    }),
    db.contact.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }),
    db.salle.findMany({
      where: { actif: true },
      include: { commune: true },
      orderBy: [{ commune: { nom: "asc" } }, { nom: "asc" }],
    }),
    db.modeleMailMairie.findUnique({ where: { id: "singleton" } }),
    db.echecMail.findMany({ where: { vuLe: null }, orderBy: { le: "desc" } }),
  ]);
  const modele = modeleEnregistre ?? MODELE_MAIRIE_DEFAUT;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-xl font-semibold text-brand-slate">Demandes à traiter</h1>
          <Link href="/admin/conventions" className="text-sm text-brand-accent hover:underline">
            Conventions des salles
          </Link>
        </div>

        {echecsMail.length > 0 && (
          <div className="flex flex-col gap-2 rounded-lg border border-status-occupee/30 bg-red-50 p-4">
            <p className="text-sm font-semibold text-status-occupee">
              {echecsMail.length > 1 ? `${echecsMail.length} mails ne sont pas partis` : "Un mail n'est pas parti"} : prévenez la
              personne directement.
            </p>
            <ul className="flex flex-col gap-2">
              {echecsMail.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-700">
                  <span>
                    <strong>{e.objet}</strong> → {e.destinataire} · {e.detail}
                    <span className="ml-1 text-xs text-slate-400">
                      ({e.le.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" })})
                    </span>
                  </span>
                  <form action={marquerEchecMailVu}>
                    <input type="hidden" name="id" value={e.id} />
                    <button type="submit" className="text-xs font-medium text-brand-accent hover:underline">
                      C&apos;est fait
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}

        {enAttente.length === 0 && (
          <p className="text-sm text-slate-500">Aucune demande en attente.</p>
        )}

        {enAttente.map((ligne) => (
          <div
            key={ligne.id}
            className="flex items-start justify-between gap-4 rounded-lg bg-white p-4 shadow-sm"
          >
            <div>
              <p className="text-sm font-medium text-slate-700">
                {ligne.demande.prof.prenom} {ligne.demande.prof.nom}
                <span className="ml-2 text-xs font-normal text-slate-400">
                  {ligne.demande.prof.email}
                </span>
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {ligne.salle.commune.nom} — {ligne.salle.nom}
              </p>
              <p className="text-sm text-slate-500">
                {formatterDate(ligne.date)} · {formatterHeure(ligne.heureDebut)}–
                {formatterHeure(ligne.heureFin)}
              </p>
              <div className="mt-2">
                <DemandeMailForm
                  salleNom={ligne.salle.nom}
                  communeNom={ligne.salle.commune.nom}
                  communeId={ligne.salle.communeId}
                  dateFormatee={formatterDate(ligne.date)}
                  heureDebut={formatterHeure(ligne.heureDebut)}
                  heureFin={formatterHeure(ligne.heureFin)}
                  contacts={contacts}
                  modele={{ sujet: modele.sujet, corps: modele.corps }}
                  demandeCreneauId={ligne.id}
                />
              </div>
              {conventionDe(ligne) && (
                <div className="mt-2">
                  <ConventionReservation convention={conventionDe(ligne)!} />
                </div>
              )}
            </div>
            <LigneAction id={ligne.id} />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-brand-slate">Réservations validées à venir</h2>
          <p className="text-sm text-slate-500">
            Annulez une réservation déjà validée pour libérer la salle sur le planning.
          </p>
        </div>

        {validees.length === 0 && (
          <p className="text-sm text-slate-500">Aucune réservation validée à venir.</p>
        )}

        {validees.map((ligne) => (
          <div
            key={[
              ligne.id,
              ligne.salleId,
              ligne.date.getTime(),
              formatterHeure(ligne.heureDebut),
              formatterHeure(ligne.heureFin),
            ].join("|")}
            id={`ligne-${ligne.id}`}
            className="flex scroll-mt-20 flex-col gap-3 rounded-lg bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {ligne.demande.prof.prenom} {ligne.demande.prof.nom}
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {ligne.demande.prof.email}
                  </span>
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {ligne.salle.commune.nom} — {ligne.salle.nom}
                </p>
                <p className="text-sm text-slate-500">
                  {formatterDate(ligne.date)} · {formatterHeure(ligne.heureDebut)}–
                  {formatterHeure(ligne.heureFin)}
                </p>
                <div className="mt-2">
                  <DemandeMailForm
                    salleNom={ligne.salle.nom}
                    communeNom={ligne.salle.commune.nom}
                    communeId={ligne.salle.communeId}
                    dateFormatee={formatterDate(ligne.date)}
                    heureDebut={formatterHeure(ligne.heureDebut)}
                    heureFin={formatterHeure(ligne.heureFin)}
                    contacts={contacts}
                    modele={{ sujet: modele.sujet, corps: modele.corps }}
                    demandeCreneauId={ligne.id}
                  />
                </div>
                {conventionDe(ligne) && (
                  <div className="mt-2">
                    <ConventionReservation convention={conventionDe(ligne)!} />
                  </div>
                )}
              </div>
              <LigneAnnulation id={ligne.id} />
            </div>
            <ModifierReservation
              id={ligne.id}
              valeurs={{
                salleId: ligne.salleId,
                date: ligne.date.toISOString().slice(0, 10),
                heureDebut: formatterHeure(ligne.heureDebut),
                heureFin: formatterHeure(ligne.heureFin),
              }}
              salles={salles}
              profPrenom={ligne.demande.prof.prenom}
              ouvertParDefaut={modifier === ligne.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
