import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { JourDetail } from "@/components/planning/JourDetail";
import {
  ajouterJours,
  axeHoraire,
  chargerOccupation,
  lireParamDate,
  lundiDe,
  versParamDate,
} from "@/lib/planning";

export default async function SalleJourPage({
  params,
  searchParams,
}: {
  params: Promise<{ salleId: string; date: string }>;
  searchParams: Promise<{ semaine?: string }>;
}) {
  const { salleId, date: dateParam } = await params;
  const { semaine: semaineParam } = await searchParams;

  const date = lireParamDate(dateParam);
  if (!date) notFound();

  const [session, salle] = await Promise.all([
    auth(),
    db.salle.findUnique({ where: { id: salleId }, include: { commune: true } }),
  ]);
  if (!salle || !salle.actif) notFound();

  const blocs = await chargerOccupation([salle.id], date, date);
  const { min, max } = axeHoraire(blocs);

  const semaine = versParamDate(lireParamDate(semaineParam) ?? lundiDe(date));
  const suffixe = `?semaine=${semaine}`;
  const lienNav = "rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50";
  const titreJour = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href={`/planning?semaine=${semaine}`} className="text-brand-accent hover:underline">
          ← Planning des salles
        </Link>
        <Link href={`/planning/salle/${salle.id}${suffixe}`} className="text-brand-accent hover:underline">
          Voir toute la semaine de cette salle
        </Link>
      </div>

      <div>
        <p className="text-sm text-slate-500">
          {salle.commune.nom} — {salle.nom}
        </p>
        <h1 className="text-xl font-semibold text-brand-slate first-letter:uppercase">{titreJour}</h1>
      </div>

      <div className="flex items-center gap-3">
        <Link href={`/planning/salle/${salle.id}/${versParamDate(ajouterJours(date, -1))}${suffixe}`} className={lienNav}>
          ← Jour précédent
        </Link>
        <Link href={`/planning/salle/${salle.id}/${versParamDate(ajouterJours(date, 1))}${suffixe}`} className={lienNav}>
          Jour suivant →
        </Link>
      </div>

      <JourDetail
        blocs={blocs}
        heureMinAxe={min}
        heureMaxAxe={max}
        estAdmin={session?.user.role === "ADMIN"}
      />
    </div>
  );
}
