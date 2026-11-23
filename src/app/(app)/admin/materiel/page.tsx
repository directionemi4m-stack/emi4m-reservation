import Link from "next/link";
import { db } from "@/lib/db";
import { euros } from "@/lib/devis";
import { coutDemande, STATUTS_EN_COURS, trierDemandes, type StatutDemande } from "@/lib/demandesMateriel";
import { CarteDemandeMateriel } from "@/components/materiel/CarteDemandeMateriel";

const VUES: { cle: string; libelle: string; statuts: StatutDemande[] }[] = [
  { cle: "en-cours", libelle: "À traiter", statuts: STATUTS_EN_COURS },
  { cle: "commandees", libelle: "Commandées", statuts: ["COMMANDEE"] },
  { cle: "terminees", libelle: "Reçues et refusées", statuts: ["RECUE", "REFUSEE"] },
];

// Toutes les demandes de matériel des profs, les plus urgentes d'abord.
export default async function MaterielDirectionPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const { vue: vueDemandee } = await searchParams;
  const vue = VUES.find((v) => v.cle === vueDemandee) ?? VUES[0];
  const toutes = await db.demandeMateriel.findMany({
    include: { auteur: { select: { prenom: true, nom: true } }, propositions: { orderBy: { creeLe: "asc" } } },
  });
  const demandes = trierDemandes(toutes.filter((d) => vue.statuts.includes(d.statut)));
  const urgentes = demandes.filter((d) => d.urgence === "URGENTE").length;
  const couts = demandes.map((d) => coutDemande(d.quantite, d.propositions));
  const total = couts.reduce((s, c) => s + (c?.centimes ?? 0), 0);
  const sansPrix = couts.filter((c) => !c).length;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Demandes de matériel</h1>
        <p className="text-sm text-slate-500">Comparez les liens et les prix, retenez une proposition, puis suivez la demande jusqu&apos;à la réception.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {VUES.map((v) => {
          const n = toutes.filter((d) => v.statuts.includes(d.statut)).length;
          return (
            <Link key={v.cle} href={`/admin/materiel?vue=${v.cle}`} className={`rounded-full px-3 py-1 text-sm ${v.cle === vue.cle ? "bg-brand-slate text-white" : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"}`}>
              {v.libelle} ({n})
            </Link>
          );
        })}
      </div>
      {demandes.length > 0 && (
        <p className="rounded-lg bg-white p-3 text-sm text-slate-700 shadow-sm">
          {urgentes > 0 && <strong className="text-red-700">{urgentes} urgente{urgentes > 1 ? "s" : ""} · </strong>}
          Total estimé : <strong className="tabular-nums">{euros(total)}</strong>
          {sansPrix > 0 && <span className="text-slate-500"> ({sansPrix} demande{sansPrix > 1 ? "s" : ""} sans prix non comptée{sansPrix > 1 ? "s" : ""})</span>}
        </p>
      )}
      <div className="flex flex-col gap-3">
        {demandes.map((d) => (
          <CarteDemandeMateriel key={d.id} demande={{ ...d, auteur: d.auteur ? `${d.auteur.prenom} ${d.auteur.nom}` : null }} peutModifier direction />
        ))}
        {demandes.length === 0 && <p className="rounded-lg bg-white p-4 text-sm text-slate-500 shadow-sm">Aucune demande ici pour l&apos;instant.</p>}
      </div>
    </div>
  );
}
