import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { modifiableParProf, STATUTS_EN_COURS, trierDemandes } from "@/lib/demandesMateriel";
import { CarteDemandeMateriel } from "@/components/materiel/CarteDemandeMateriel";
import { FormDemandeMateriel } from "@/components/materiel/FormDemandeMateriel";

// Demandes de matériel d'un prof : nouvelle demande, puis le suivi des siennes.
export default async function MaterielPage() {
  const session = await auth();
  const demandes = await db.demandeMateriel.findMany({
    where: { auteurId: session!.user.id },
    orderBy: { creeLe: "desc" },
    include: { propositions: { orderBy: { creeLe: "asc" } } },
  });
  const enCours = trierDemandes(demandes.filter((d) => STATUTS_EN_COURS.includes(d.statut)));
  const autres = demandes.filter((d) => !STATUTS_EN_COURS.includes(d.statut));
  const carte = (d: (typeof demandes)[number]) => (
    <CarteDemandeMateriel key={d.id} demande={{ ...d, auteur: null }} peutModifier={modifiableParProf(d.statut)} />
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-brand-slate">Demandes de matériel</h1>
          <p className="text-sm text-slate-500">Dites ce qu&apos;il vous faut, avec son urgence, et ajoutez si possible un lien et un prix.</p>
        </div>
        {session!.user.role === "ADMIN" && !session!.user.impersonation && (
          <Link href="/admin/materiel" className="text-sm font-medium text-brand-accent hover:underline">
            Toutes les demandes
          </Link>
        )}
      </div>
      <section className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-brand-slate">Nouvelle demande</h2>
        <FormDemandeMateriel />
      </section>
      {enCours.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-brand-slate">En cours</h2>
          {enCours.map(carte)}
        </section>
      )}
      {autres.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-brand-slate">Commandées, reçues ou refusées</h2>
          {autres.map(carte)}
        </section>
      )}
    </div>
  );
}
