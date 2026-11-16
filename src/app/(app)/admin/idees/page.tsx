import Link from "next/link";
import { db } from "@/lib/db";
import { COULEUR_STATUT_IDEE, LIBELLE_STATUT_IDEE, LIBELLE_TYPE_IDEE, type StatutIdee, type TypeIdee } from "@/lib/idees";
import { TraitementIdee } from "@/components/idees/TraitementIdee";

const jour = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" });
const OUVERTES: StatutIdee[] = ["NOUVELLE", "A_L_ETUDE", "RETENUE"];

// Les idées et demandes d'amélioration des profs : à trier, à suivre, à répondre.
export default async function IdeesDirectionPage({ searchParams }: { searchParams: Promise<{ type?: string; voir?: string }> }) {
  const { type: typeDemande, voir } = await searchParams;
  const type = typeDemande === "ECOLE" || typeDemande === "APPLI" ? (typeDemande as TypeIdee) : null;
  const toutes = voir === "toutes";
  const idees = await db.idee.findMany({
    where: { ...(type ? { type } : {}), ...(toutes ? {} : { statut: { in: OUVERTES } }) },
    orderBy: [{ creeLe: "desc" }],
    include: { auteur: { select: { prenom: true, nom: true } } },
  });
  const lien = (t: string | null, v: string | null) => {
    const q = new URLSearchParams();
    if (t) q.set("type", t);
    if (v) q.set("voir", v);
    return `/admin/idees${q.size ? `?${q}` : ""}`;
  };
  const puce = (actif: boolean) => `rounded-full px-3 py-1 text-sm ${actif ? "bg-brand-slate text-white" : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"}`;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Boîte à idées</h1>
        <p className="text-sm text-slate-500">
          Les idées pour l&apos;école et les demandes d&apos;amélioration de l&apos;appli envoyées par les profs. Changez le statut et répondez :
          le prof est prévenu par mail (sauf les idées anonymes).
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={lien(null, toutes ? "toutes" : null)} className={puce(!type)}>
          Tout
        </Link>
        <Link href={lien("ECOLE", toutes ? "toutes" : null)} className={puce(type === "ECOLE")}>
          💡 École
        </Link>
        <Link href={lien("APPLI", toutes ? "toutes" : null)} className={puce(type === "APPLI")}>
          🛠️ Appli
        </Link>
        <span className="mx-1 w-px bg-slate-200" />
        <Link href={lien(type, null)} className={puce(!toutes)}>
          En cours
        </Link>
        <Link href={lien(type, "toutes")} className={puce(toutes)}>
          Avec les réalisées et refusées
        </Link>
      </div>
      <ul className="flex flex-col gap-3">
        {idees.map((i) => (
          <li key={i.id} className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{i.titre}</p>
                <p className="text-xs text-slate-500">
                  {LIBELLE_TYPE_IDEE[i.type]} · {i.auteur ? `${i.auteur.prenom} ${i.auteur.nom}` : "Anonyme"} · {jour(i.creeLe)}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COULEUR_STATUT_IDEE[i.statut]}`}>{LIBELLE_STATUT_IDEE[i.statut]}</span>
            </div>
            <p className="whitespace-pre-line text-sm text-slate-700">{i.texte}</p>
            <TraitementIdee id={i.id} statut={i.statut} reponse={i.reponse ?? ""} anonyme={!i.auteurId} />
          </li>
        ))}
        {idees.length === 0 && <li className="rounded-lg bg-white p-4 text-sm text-slate-500 shadow-sm">Aucune idée {toutes ? "" : "en cours "}pour l&apos;instant.</li>}
      </ul>
    </div>
  );
}
