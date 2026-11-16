import Link from "next/link";
import { IconExternalLink, IconFileTypePdf, IconTrash } from "@tabler/icons-react";
import { db } from "@/lib/db";
import { salariesDuRegistre } from "@/lib/clesServeur";
import { anneeScolaireDebut, libelleAnneeScolaire } from "@/lib/fraisRecap";
import { LIBELLE_STATUT_CONTRAT, LIBELLE_TYPE_CONTRAT, statutContrat, type StatutContrat } from "@/lib/contrats";
import { attendPresidence, presidence } from "@/lib/contratsServeur";
import { AjoutContrat } from "@/components/contrats/AjoutContrat";
import { ActionContrat } from "@/components/contrats/ActionContrat";
import { envoyerALaPresidence, rangerDansLeDrive, relancerProf, supprimerContrat } from "./actions";

const COULEUR: Record<StatutContrat, string> = {
  PAPIER: "bg-slate-100 text-slate-600",
  BROUILLON: "bg-slate-100 text-slate-600",
  PRESIDENCE: "bg-status-attente/15 text-amber-800",
  PROF: "bg-sky-100 text-sky-800",
  SIGNE: "bg-status-dispo/15 text-emerald-800",
};
const jour = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
const anneeCourante = () => anneeScolaireDebut(new Date());

// Contrats et avenants des profs, par année scolaire : dépôt des PDF, signature par la
// présidence (à distance) puis par chaque prof (dans l'appli), archivage dans le Drive.
export default async function ContratsPage({ searchParams }: { searchParams: Promise<{ annee?: string }> }) {
  const courante = anneeCourante();
  const demandee = Number((await searchParams).annee);
  const annee = Number.isInteger(demandee) && demandee > 2000 ? demandee : courante;
  const [p, profs, contrats, enAttente, brouillons, annees] = await Promise.all([
    presidence(),
    db.user.findMany({ where: salariesDuRegistre, orderBy: [{ nom: "asc" }, { prenom: "asc" }], select: { id: true, prenom: true, nom: true } }),
    db.contratProf.findMany({
      where: { anneeDebut: annee },
      orderBy: [{ prof: { nom: "asc" } }, { creeLe: "asc" }],
      select: {
        id: true,
        type: true,
        titre: true,
        papier: true,
        creeLe: true,
        envoyeLe: true,
        presidenceSigneLe: true,
        presidenceNom: true,
        profSigneLe: true,
        driveUrl: true,
        prof: { select: { id: true, prenom: true, nom: true } },
      },
    }),
    db.contratProf.count({ where: attendPresidence }),
    db.contratProf.count({ where: { papier: false, envoyeLe: null } }),
    db.contratProf.findMany({ distinct: ["anneeDebut"], select: { anneeDebut: true }, orderBy: { anneeDebut: "desc" } }),
  ]);
  const presidencePrete = !!(p.nom && p.email);
  const parProf = new Map<string, typeof contrats>();
  for (const c of contrats) parProf.set(c.prof.id, [...(parProf.get(c.prof.id) ?? []), c]);
  const listeAnnees = [...new Set([courante, courante + 1, ...annees.map((a) => a.anneeDebut)])].sort((a, b) => b - a);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Contrats et avenants des profs</h1>
        <p className="text-sm text-slate-500">
          Déposez le PDF : la présidence le signe à distance (lien par mail), puis le prof le signe sur son téléphone. Chacun paraphe chaque
          page. Le prof reçoit son exemplaire signé par les deux, et la copie est rangée dans le Drive (« Contrats des profs »).
        </p>
      </div>

      <section className="flex flex-col gap-2 rounded-lg bg-white p-4 text-sm shadow-sm">
        {presidencePrete ? (
          <p className="text-slate-700">
            Signature pour l&apos;EMI4M : <strong>{p.nom}</strong>
            {p.qualite && `, ${p.qualite}`} <span className="text-slate-500">({p.email})</span> ·{" "}
            <Link href="/admin/parametres/ecole" className="text-brand-accent hover:underline">
              changer
            </Link>
          </p>
        ) : (
          <p className="rounded-md bg-status-attente/10 p-2 text-slate-700">
            Indiquez d&apos;abord la présidence (nom, fonction, mail) dans{" "}
            <Link href="/admin/parametres/ecole" className="font-medium text-brand-accent hover:underline">
              Coordonnées de l&apos;école
            </Link>
            .
          </p>
        )}
        {presidencePrete && (enAttente > 0 || brouillons > 0) && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-600">
              {enAttente > 0 && `${enAttente} document${enAttente > 1 ? "s" : ""} attend${enAttente > 1 ? "ent" : ""} la présidence. `}
              {brouillons > 0 && `${brouillons} pas encore envoyé${brouillons > 1 ? "s" : ""}.`}
            </span>
            <ActionContrat action={envoyerALaPresidence} libelle={brouillons > 0 ? "Envoyer à la présidence" : "Renvoyer le lien à la présidence"} principal />
          </div>
        )}
      </section>

      <AjoutContrat profs={profs.map((x) => ({ id: x.id, nom: `${x.nom.toUpperCase()} ${x.prenom}` }))} anneeDebut={annee} presidencePrete={presidencePrete} />

      <div className="flex flex-wrap items-center gap-2">
        {listeAnnees.map((a) => (
          <Link
            key={a}
            href={`/admin/contrats?annee=${a}`}
            className={`rounded-full px-3 py-1 text-sm ${a === annee ? "bg-brand-slate text-white" : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"}`}
          >
            {libelleAnneeScolaire(a)}
          </Link>
        ))}
      </div>

      <ul className="flex flex-col gap-3">
        {[...parProf.values()].map((liste) => (
          <li key={liste[0].prof.id} className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-brand-slate">
              {liste[0].prof.nom.toUpperCase()} {liste[0].prof.prenom}
            </p>
            <ul className="mt-2 flex flex-col divide-y divide-slate-100">
              {liste.map((c) => {
                const statut = statutContrat(c);
                return (
                  <li key={c.id} className="flex flex-col gap-2 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-800">
                          {LIBELLE_TYPE_CONTRAT[c.type]} · {c.titre}
                        </p>
                        <p className="text-xs text-slate-500">
                          Déposé le {jour(c.creeLe)}
                          {c.presidenceSigneLe && ` · présidence le ${jour(c.presidenceSigneLe)}`}
                          {c.profSigneLe && ` · prof le ${jour(c.profSigneLe)}`}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COULEUR[statut]}`}>{LIBELLE_STATUT_CONTRAT[statut]}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={`/api/contrats/${c.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        <IconFileTypePdf size={14} aria-hidden /> PDF
                      </a>
                      {c.driveUrl && (
                        <a href={c.driveUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-brand-accent hover:underline">
                          <IconExternalLink size={13} aria-hidden /> Drive
                        </a>
                      )}
                      {statut === "BROUILLON" && presidencePrete && <ActionContrat action={envoyerALaPresidence} id={c.id} libelle="Envoyer à la présidence" />}
                      {statut === "PROF" && <ActionContrat action={relancerProf} id={c.id} libelle="Renvoyer au prof" />}
                      {(statut === "SIGNE" || statut === "PAPIER") && !c.driveUrl && <ActionContrat action={rangerDansLeDrive} id={c.id} libelle="Ranger dans le Drive" />}
                      {!c.presidenceSigneLe && (
                        <form action={supprimerContrat}>
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit" className="inline-flex items-center gap-1 px-1 text-xs text-slate-400 hover:text-status-occupee">
                            <IconTrash size={13} aria-hidden /> Retirer
                          </button>
                        </form>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
        {contrats.length === 0 && <li className="rounded-lg bg-white p-4 text-sm text-slate-500 shadow-sm">Aucun contrat pour {libelleAnneeScolaire(annee)}.</li>}
      </ul>
    </div>
  );
}
