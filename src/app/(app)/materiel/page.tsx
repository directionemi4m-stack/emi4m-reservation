import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { peutModifierDemande, STATUTS_EN_COURS, trierDemandes, type StatutDemande } from "@/lib/demandesMateriel";
import { CarteDemandeMateriel } from "@/components/materiel/CarteDemandeMateriel";
import { FormDemandeMateriel } from "@/components/materiel/FormDemandeMateriel";

const VUES: { cle: string; libelle: string; statuts: StatutDemande[] }[] = [
  { cle: "en-cours", libelle: "En cours", statuts: STATUTS_EN_COURS },
  { cle: "commandees", libelle: "Commandées", statuts: ["COMMANDEE"] },
  { cle: "terminees", libelle: "Reçues et refusées", statuts: ["RECUE", "REFUSEE"] },
];

// Demandes de matériel, visibles par tous pour éviter les doublons : chacun ne modifie que
// les siennes.
export default async function MaterielPage({ searchParams }: { searchParams: Promise<{ vue?: string; voir?: string }> }) {
  const { vue: vueDemandee, voir } = await searchParams;
  const session = await auth();
  const moi = session!.user;
  const vue = VUES.find((v) => v.cle === vueDemandee) ?? VUES[0];
  const miennes = voir === "miennes";
  const toutes = await db.demandeMateriel.findMany({
    include: { auteur: { select: { prenom: true, nom: true } }, propositions: { orderBy: { creeLe: "asc" } } },
  });
  const perimetre = miennes ? toutes.filter((d) => d.auteurId === moi.id) : toutes;
  const demandes = trierDemandes(perimetre.filter((d) => vue.statuts.includes(d.statut)));
  const lien = (v: string, m: boolean) => `/materiel?vue=${v}${m ? "&voir=miennes" : ""}`;
  const puce = (actif: boolean) => `rounded-full px-3 py-1 text-sm ${actif ? "bg-brand-slate text-white" : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"}`;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-brand-slate">Demandes de matériel</h1>
          <p className="text-sm text-slate-500">Tout le monde voit toutes les demandes. Chacun ne peut modifier que les siennes.</p>
        </div>
        {moi.role === "ADMIN" && !moi.impersonation && (
          <Link href="/admin/materiel" className="text-sm font-medium text-brand-accent hover:underline">
            Traiter les demandes
          </Link>
        )}
      </div>
      <section className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-brand-slate">Nouvelle demande</h2>
        <FormDemandeMateriel />
      </section>
      <div className="flex flex-wrap gap-2">
        {VUES.map((v) => (
          <Link key={v.cle} href={lien(v.cle, miennes)} className={puce(v.cle === vue.cle)}>
            {v.libelle} ({perimetre.filter((d) => v.statuts.includes(d.statut)).length})
          </Link>
        ))}
        <span className="mx-1 w-px bg-slate-200" />
        <Link href={lien(vue.cle, false)} className={puce(!miennes)}>
          Toutes
        </Link>
        <Link href={lien(vue.cle, true)} className={puce(miennes)}>
          Mes demandes
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {demandes.map((d) => (
          <CarteDemandeMateriel
            key={d.id}
            demande={{ ...d, auteur: d.auteur ? `${d.auteur.prenom} ${d.auteur.nom}${d.auteurId === moi.id ? " (vous)" : ""}` : null }}
            peutModifier={peutModifierDemande(moi, d)}
          />
        ))}
        {demandes.length === 0 && <p className="rounded-lg bg-white p-4 text-sm text-slate-500 shadow-sm">Aucune demande ici pour l&apos;instant.</p>}
      </div>
    </div>
  );
}
