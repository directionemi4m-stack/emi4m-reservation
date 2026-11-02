import Link from "next/link";
import { db } from "@/lib/db";
import { enCirculation, resumeAcces, totalAcces } from "@/lib/cles";
import { anneeScolaireDebut } from "@/lib/fraisRecap";
import { filtreSaison, salariesDuRegistre } from "@/lib/clesServeur";
import { BoutonRegistre, CarteSalarie, type SalarieVue } from "@/components/cles/Cles";

const iso = (d: Date) => d.toISOString().slice(0, 10);

// Registre des clés et badges : la direction remet ou récupère les clés, et le salarié
// signe au doigt sur son téléphone. Réservé à la direction (cf. admin/layout.tsx).
export default async function ClesPage({ searchParams }: { searchParams: Promise<{ saison?: string }> }) {
  const courante = anneeScolaireDebut(new Date());
  const demandee = Number((await searchParams).saison);
  const anneeDebut = Number.isInteger(demandee) && demandee >= 2000 && demandee <= 2100 ? demandee : courante;

  const [salaries, remisesSaison, toutesOuvertes, registre, saisonsAvecRemises] = await Promise.all([
    db.user.findMany({ where: salariesDuRegistre, orderBy: [{ nom: "asc" }, { prenom: "asc" }], select: { id: true, prenom: true, nom: true } }),
    db.remiseCles.findMany({
      where: filtreSaison(anneeDebut),
      orderBy: { remiseLe: "asc" },
      select: {
        id: true,
        profId: true,
        clesAutransMeaudre: true,
        badgeLans: true,
        clesVillard: true,
        remiseLe: true,
        restitueLe: true,
        restitutionPapier: true,
      },
    }),
    // Ce que chacun détient aujourd'hui, toutes saisons confondues.
    db.remiseCles.findMany({
      where: { restitueLe: null },
      select: { profId: true, clesAutransMeaudre: true, badgeLans: true, clesVillard: true, restitueLe: true },
    }),
    db.registreCles.findUnique({ where: { anneeDebut } }),
    db.remiseCles.findMany({ select: { remiseLe: true } }),
  ]);
  // Quelles lignes portent une signature électronique (sans charger les images).
  const avecSignature = new Set(
    (
      await db.remiseCles.findMany({
        where: { id: { in: remisesSaison.map((r) => r.id) }, NOT: { signatureRemise: null } },
        select: { id: true },
      })
    ).map((r) => r.id)
  );
  const restitutionSignee = new Set(
    (
      await db.remiseCles.findMany({
        where: { id: { in: remisesSaison.map((r) => r.id) }, NOT: { signatureRestitution: null } },
        select: { id: true },
      })
    ).map((r) => r.id)
  );

  const vues: SalarieVue[] = salaries.map((s) => ({
    id: s.id,
    prenom: s.prenom,
    nom: s.nom,
    detient: resumeAcces(enCirculation(toutesOuvertes.filter((r) => r.profId === s.id))),
    remises: remisesSaison
      .filter((r) => r.profId === s.id)
      .map((r) => ({
        id: r.id,
        resume: resumeAcces(r),
        remiseLe: iso(r.remiseLe),
        remiseSignee: avecSignature.has(r.id),
        restitueLe: r.restitueLe ? iso(r.restitueLe) : null,
        restitutionSignee: restitutionSignee.has(r.id),
      })),
  }));
  const total = totalAcces(enCirculation(toutesOuvertes));
  const saisons = [...new Set([...saisonsAvecRemises.map((r) => anneeScolaireDebut(r.remiseLe)), courante, anneeDebut])].sort((a, b) => b - a);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Clés et badges</h1>
        <p className="text-sm text-slate-500">
          {total} clé{total > 1 ? "s" : ""} et badge{total > 1 ? "s" : ""} en circulation. Le salarié signe au doigt sur ce
          téléphone, à la remise comme à la restitution.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {saisons.map((s) => (
          <Link
            key={s}
            href={`/admin/cles?saison=${s}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              s === anneeDebut ? "bg-brand-slate text-white" : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"
            }`}
          >
            {s}-{s + 1}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 text-sm shadow-sm">
        {registre ? (
          <a href={registre.url} target="_blank" rel="noreferrer" className="font-medium text-brand-accent hover:underline">
            Registre signé {anneeDebut}-{anneeDebut + 1} (PDF)
          </a>
        ) : (
          <span className="text-slate-500">Le registre PDF est créé dans le Drive à la première signature.</span>
        )}
        <BoutonRegistre anneeDebut={anneeDebut} />
      </div>

      <ul className="flex flex-col gap-2">
        {vues.map((s) => (
          <CarteSalarie key={s.id} salarie={s} />
        ))}
      </ul>
    </div>
  );
}
