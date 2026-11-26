import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  campagneOuverte,
  dateOuverture,
  libelleMatiere,
  libellePeriode,
  libelleTrimestre,
  MATIERES_CHAM,
  signatureEnDataUrl,
  TRIMESTRES,
} from "@/lib/bulletinsCham";
import { retirerSuivi } from "@/app/(app)/bulletins-cham/actions";
import { AjouterSuiviForm } from "@/components/bulletins/FormsBulletin";
import { ActiverNotifications } from "@/components/notifications/ActiverNotifications";
import { CalendrierRappels } from "@/components/bulletins/CalendrierRappels";
import { EnvoiFamilles } from "@/components/bulletins/EnvoiFamilles";
import { contexteBulletins } from "@/lib/calendrierBulletinsServeur";
import { etatsEnvoi, nomDirection } from "@/lib/bulletinsChamServeur";
import { classeEnAnnee } from "@/lib/cham";

// Signature et envoi groupés : traités élève par élève depuis le navigateur.
export const maxDuration = 300;

const ordreMatiere = (m: string) => MATIERES_CHAM.findIndex((x) => x.valeur === m);
const dateCourte = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
const iso = (d: Date) => d.toISOString().slice(0, 10);
const dateHeure = (d: Date) => {
  const fr = { timeZone: "Europe/Paris" } as const;
  return `${d.toLocaleDateString("fr-FR", { ...fr, weekday: "long", day: "numeric", month: "long", year: "numeric" })} à ${d.toLocaleTimeString("fr-FR", { ...fr, hour: "2-digit", minute: "2-digit" }).replace(":", "h")}`;
};
// Aujourd'hui et demain à Paris, au format des champs de date.
function joursRepere() {
  const aujourdHui = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
  return { aujourdHui, demain: new Date(Date.parse(`${aujourdHui}T00:00:00.000Z`) + 86_400_000).toISOString().slice(0, 10) };
}

export default async function BulletinsChamPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const session = await auth();
  const userId = session!.user.id;
  const estAdmin = session!.user.role === "ADMIN";
  const impersonation = Boolean(session!.user.impersonation);

  const { periode: courante, calendrier } = await contexteBulletins(new Date());
  const t = Number((await searchParams).t);
  const periode = { anneeDebut: courante.anneeDebut, trimestre: [1, 2, 3].includes(t) ? t : courante.trimestre };
  const ouverte = campagneOuverte(new Date(), periode.anneeDebut, periode.trimestre, calendrier);

  const [eleves, mesSuivis, mesAppreciations, tousSuivis, toutesAppreciations, bulletins, envois, maSignature, direction, rappels] = await Promise.all([
    db.eleveCham.findMany({ orderBy: [{ nom: "asc" }, { prenom: "asc" }], select: { id: true, prenom: true, nom: true, anneeSixieme: true } }),
    db.suiviCham.findMany({ where: { profId: userId }, include: { eleve: { select: { prenom: true, nom: true, anneeSixieme: true } } } }),
    db.appreciationCham.findMany({ where: { profId: userId, ...periode }, select: { eleveId: true, matiere: true, signeLe: true } }),
    estAdmin ? db.suiviCham.findMany({ select: { eleveId: true, profId: true, matiere: true } }) : Promise.resolve([]),
    estAdmin
      ? db.appreciationCham.findMany({ where: periode, select: { eleveId: true, profId: true, matiere: true } })
      : Promise.resolve([]),
    estAdmin
      ? db.bulletinCham.findMany({ where: periode, select: { eleveId: true, signeDirectionLe: true, documentUrl: true } })
      : Promise.resolve([]),
    estAdmin ? etatsEnvoi(periode.anneeDebut, periode.trimestre) : Promise.resolve(null),
    estAdmin && !impersonation ? db.signatureBulletin.findUnique({ where: { userId } }) : Promise.resolve(null),
    estAdmin ? nomDirection() : Promise.resolve(""),
    estAdmin ? db.rappelBulletinCham.findMany({ where: { anneeDebut: periode.anneeDebut } }) : Promise.resolve([]),
  ]);
  const { aujourdHui, demain } = joursRepere();
  const envoiDe = (t: number, type: string) => rappels.find((r) => r.trimestre === t && r.type === type)?.envoyeLe ?? null;
  const dernierRappel = rappels.reduce<Date | null>((m, r) => (!m || r.envoyeLe > m ? r.envoyeLe : m), null);

  const signeLe = new Map(mesAppreciations.map((a) => [`${a.eleveId}|${a.matiere}`, a.signeLe]));
  const suivis = [...mesSuivis].sort(
    (a, b) => a.eleve.nom.localeCompare(b.eleve.nom) || a.eleve.prenom.localeCompare(b.eleve.prenom) || ordreMatiere(a.matiere) - ordreMatiere(b.matiere)
  );
  const restants = suivis.filter((s) => !signeLe.has(`${s.eleveId}|${s.matiere}`)).length;
  // La classe de l'élève pour l'année des bulletins affichés.
  const classe = (e: { anneeSixieme: number | null }) => classeEnAnnee(e.anneeSixieme, periode.anneeDebut);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Bulletins CHAM</h1>
        <p className="text-sm text-slate-500">
          {ouverte
            ? `${libellePeriode(periode.anneeDebut, periode.trimestre)} : à remplir depuis le ${dateCourte(dateOuverture(periode.anneeDebut, periode.trimestre, calendrier))}.`
            : `${libellePeriode(periode.anneeDebut, periode.trimestre)} : ouverture le ${dateCourte(dateOuverture(periode.anneeDebut, periode.trimestre, calendrier))}, vous pouvez déjà préparer vos appréciations.`}
        </p>
      </div>

      <nav className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm" aria-label="Trimestre">
        {TRIMESTRES.map((n) => (
          <Link
            key={n}
            href={`/bulletins-cham?t=${n}`}
            className={`flex-1 rounded-md px-3 py-1.5 text-center ${
              n === periode.trimestre ? "bg-white font-semibold text-brand-slate shadow-sm" : "text-slate-500 hover:text-brand-slate"
            }`}
          >
            {libelleTrimestre(n)}
          </Link>
        ))}
      </nav>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-brand-slate">
          Mes élèves {suivis.length > 0 && <span className="font-normal text-slate-500">— {restants === 0 ? "tout est signé" : `${restants} à signer`}</span>}
        </h2>
        {suivis.length === 0 ? (
          <p className="rounded-lg bg-white p-4 text-sm text-slate-500 shadow-sm">
            Ajoutez ci-dessous les élèves CHAM que vous suivez, avec la rubrique du bulletin qui vous concerne. Cette liste est
            gardée pour les trimestres suivants.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg bg-white shadow-sm">
            {suivis.map((s) => {
              const signe = signeLe.get(`${s.eleveId}|${s.matiere}`);
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700">
                      {s.eleve.nom.toUpperCase()} {s.eleve.prenom}
                    </p>
                    <p className="text-xs text-slate-500">
                      {classe(s.eleve) ? `${classe(s.eleve)} · ` : ""}
                      {libelleMatiere(s.matiere)}
                      {s.precision ? ` · ${s.precision}` : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      signe ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {signe ? `Signé le ${signe.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}` : "À remplir"}
                  </span>
                  <Link
                    href={`/bulletins-cham/${s.eleveId}?t=${periode.trimestre}`}
                    className="rounded-md bg-brand-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-accent/90"
                  >
                    {signe ? "Voir" : "Remplir"}
                  </Link>
                  <form action={retirerSuivi}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className="text-xs text-slate-400 hover:text-status-occupee" title="Retirer de ma liste">
                      Retirer
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
        <AjouterSuiviForm
          eleves={eleves.map((e) => ({ id: e.id, libelle: `${e.nom.toUpperCase()} ${e.prenom}${classe(e) ? ` (${classe(e)})` : ""}` }))}
        />
      </section>

      <ActiverNotifications bloque={impersonation} />

      {estAdmin && envois && (
        <EnvoiFamilles
          lignes={envois.map((e) => ({ ...e, envoyeLe: e.envoyeLe?.toISOString() ?? null }))}
          periode={periode}
          libellePeriode={libellePeriode(periode.anneeDebut, periode.trimestre)}
          maSignature={maSignature ? signatureEnDataUrl(maSignature.image) : null}
          directionNom={direction}
          bloque={impersonation}
        />
      )}

      {estAdmin && (
        <CalendrierRappels
          anneeDebut={periode.anneeDebut}
          lignes={TRIMESTRES.map((t) => ({
            trimestre: t,
            ouverture: iso(calendrier[t].ouverture),
            relance: iso(calendrier[t].relance),
            ouvertureEnvoyee: envoiDe(t, "OUVERTURE") ? dateHeure(envoiDe(t, "OUVERTURE")!) : null,
            relanceEnvoyee: envoiDe(t, "RELANCE") ? dateHeure(envoiDe(t, "RELANCE")!) : null,
          }))}
          dernier={dernierRappel ? dateHeure(dernierRappel) : null}
          aujourdHui={aujourdHui}
          demain={demain}
          bloque={impersonation}
        />
      )}

      {estAdmin && (
        <SuiviDirection
          eleves={eleves.map((e) => ({ ...e, classe: classe(e) }))}
          suivis={tousSuivis}
          appreciations={toutesAppreciations}
          bulletins={bulletins}
          trimestre={periode.trimestre}
        />
      )}
    </div>
  );
}

// Vue d'ensemble pour la direction : pour chaque élève, les parties signées sur celles
// attendues (d'après les profs qui l'ont déclaré), la signature de la direction et le PDF.
function SuiviDirection({
  eleves,
  suivis,
  appreciations,
  bulletins,
  trimestre,
}: {
  eleves: { id: string; prenom: string; nom: string; classe: string | null }[];
  suivis: { eleveId: string; profId: string; matiere: string }[];
  appreciations: { eleveId: string; profId: string; matiere: string }[];
  bulletins: { eleveId: string; signeDirectionLe: Date | null; documentUrl: string | null }[];
  trimestre: number;
}) {
  const signees = new Set(appreciations.map((a) => `${a.eleveId}|${a.profId}|${a.matiere}`));
  const parEleve = new Map(bulletins.map((b) => [b.eleveId, b]));

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-brand-slate">Suivi de tous les bulletins (direction)</h2>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Élève</th>
              <th className="px-4 py-2 font-medium">Profs</th>
              <th className="px-4 py-2 font-medium">Direction</th>
              <th className="px-4 py-2 font-medium">PDF</th>
            </tr>
          </thead>
          <tbody>
            {eleves.map((e) => {
              const attendus = suivis.filter((s) => s.eleveId === e.id);
              const faits = attendus.filter((s) => signees.has(`${s.eleveId}|${s.profId}|${s.matiere}`)).length;
              const bulletin = parEleve.get(e.id);
              return (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    <Link href={`/bulletins-cham/${e.id}?t=${trimestre}`} className="text-brand-accent hover:underline">
                      {e.nom.toUpperCase()} {e.prenom}
                    </Link>
                    {e.classe && <span className="ml-1.5 text-xs text-slate-500">{e.classe}</span>}
                  </td>
                  <td className="px-4 py-2">
                    {attendus.length === 0 ? (
                      <span className="text-xs text-status-occupee">Aucun prof déclaré</span>
                    ) : (
                      <span className={faits === attendus.length ? "text-status-dispo" : "text-slate-600"}>
                        {faits}/{attendus.length} signé{faits > 1 ? "s" : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{bulletin?.signeDirectionLe ? "Signé" : "—"}</td>
                  <td className="px-4 py-2">
                    {bulletin?.documentUrl ? (
                      <a href={bulletin.documentUrl} target="_blank" rel="noreferrer" className="text-brand-accent hover:underline">
                        Ouvrir
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
