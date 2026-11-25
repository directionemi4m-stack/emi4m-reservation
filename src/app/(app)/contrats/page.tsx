import { IconFileTypePdf } from "@tabler/icons-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { libelleAnneeScolaire } from "@/lib/fraisRecap";
import { LIBELLE_TYPE_CONTRAT } from "@/lib/contrats";
import { SignatureContrat } from "@/components/contrats/SignatureContrat";
import { aujourdHuiUTC, quandVisite } from "@/lib/santeTravailServeur";
import { calculerSuivi, dateCourte, LIBELLE_AVIS, LIBELLE_TYPE_VISITE } from "@/lib/santeTravail";

const jour = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

// Mes contrats et avenants : ceux à signer (déjà signés par la présidence), puis l'historique.
export default async function MesContratsPage() {
  const session = await auth();
  const contrats = await db.contratProf.findMany({
    where: { profId: session!.user.id, OR: [{ papier: true }, { presidenceSigneLe: { not: null } }] },
    orderBy: [{ anneeDebut: "desc" }, { creeLe: "desc" }],
    select: { id: true, anneeDebut: true, type: true, titre: true, papier: true, presidenceSigneLe: true, presidenceNom: true, profSigneLe: true },
  });
  const aSigner = contrats.filter((c) => !c.papier && !c.profSigneLe);
  // Santé au travail : ma prochaine convocation, mes visites passées et leurs attestations.
  const sante = await db.salarieSante.findUnique({
    where: { userId: session!.user.id },
    select: {
      categorie: true,
      embaucheLe: true,
      sortieLe: true,
      affilieLe: true,
      desaffilieLe: true,
      anneeNaissance: true,
      visites: {
        where: { statut: { in: ["PREVUE", "REALISEE"] } },
        orderBy: { date: "desc" },
        select: { id: true, type: true, statut: true, date: true, heure: true, lieu: true, avis: true, prochaineAvant: true, nomFichier: true },
      },
    },
  });
  const aujourdHui = aujourdHuiUTC();
  const convocations = (sante?.visites ?? []).filter((v) => v.statut === "PREVUE" && v.date && v.date >= aujourdHui).reverse();
  const passees = (sante?.visites ?? []).filter((v) => v.statut === "REALISEE");
  const echeance = sante && !convocations.length ? calculerSuivi(sante, aujourdHui).echeance : null;
  const autres = contrats.filter((c) => c.papier || c.profSigneLe);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Mes contrats</h1>
        <p className="text-sm text-slate-500">Vos contrats et avenants avec l&apos;EMI4M, année par année.</p>
      </div>

      {aSigner.map((c) => (
        <section key={c.id} className="flex flex-col gap-3 rounded-lg border-2 border-brand-accent/40 bg-white p-4 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase text-brand-accent">À signer</p>
            <h2 className="text-base font-semibold text-brand-slate">
              {LIBELLE_TYPE_CONTRAT[c.type]} {libelleAnneeScolaire(c.anneeDebut)} — {c.titre}
            </h2>
            <p className="text-xs text-slate-500">
              Signé pour l&apos;EMI4M par {c.presidenceNom} le {jour(c.presidenceSigneLe!)}.
            </p>
          </div>
          <SignatureContrat id={c.id} lienPdf={`/api/contrats/${c.id}`} />
        </section>
      ))}

      <section className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-slate">Mes documents signés</h2>
        <ul className="mt-2 flex flex-col divide-y divide-slate-100">
          {autres.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="text-sm text-slate-800">
                  {LIBELLE_TYPE_CONTRAT[c.type]} {libelleAnneeScolaire(c.anneeDebut)} — {c.titre}
                </p>
                <p className="text-xs text-slate-500">{c.papier ? "Signé sur papier" : `Signé le ${jour(c.profSigneLe!)}`}</p>
              </div>
              <a href={`/api/contrats/${c.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                <IconFileTypePdf size={14} aria-hidden /> PDF
              </a>
            </li>
          ))}
          {autres.length === 0 && <li className="py-2 text-sm text-slate-500">Aucun document pour l&apos;instant.</li>}
        </ul>
      </section>

      {sante && (convocations.length > 0 || passees.length > 0) && (
        <section id="visites" className="scroll-mt-4 rounded-lg bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-brand-slate">Mes visites de santé au travail</h2>
          {convocations.map((v) => (
            <div key={v.id} className="mt-2 rounded-md border-2 border-brand-accent/40 p-3">
              <p className="text-xs font-semibold uppercase text-brand-accent">Convocation</p>
              <p className="text-sm font-medium text-slate-800">
                {LIBELLE_TYPE_VISITE[v.type]} le {quandVisite(v)}
              </p>
              {v.lieu && <p className="text-sm text-slate-600">{v.lieu}</p>}
              <p className="mt-1 text-xs text-slate-500">Le temps de la visite compte comme du temps de travail. Empêché ? Prévenez la direction au plus vite.</p>
            </div>
          ))}
          {echeance && <p className="mt-2 text-sm text-slate-600">Prochaine visite à prévoir avant le {dateCourte(echeance)} : la direction vous transmettra la convocation.</p>}
          <ul className="mt-2 flex flex-col divide-y divide-slate-100">
            {passees.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-slate-800">
                    {LIBELLE_TYPE_VISITE[v.type]} · {dateCourte(v.date!)}
                  </p>
                  {v.avis && <p className="text-xs text-slate-500">{LIBELLE_AVIS[v.avis]}</p>}
                </div>
                {v.nomFichier && (
                  <a href={`/api/sante/visites/${v.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    <IconFileTypePdf size={14} aria-hidden /> Attestation
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
