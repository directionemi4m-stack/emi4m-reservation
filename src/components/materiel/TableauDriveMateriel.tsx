"use client";

import { useActionState } from "react";
import { IconBrandGoogleDrive } from "@tabler/icons-react";
import { mettreAJourTableauMateriel, type EtatAction } from "@/app/(app)/materiel/actions";

// Le tableau Google Sheets des demandes : lien, et mise à jour à la main après une panne.
export function TableauDriveMateriel({ url, majLe, echec }: { url: string | null; majLe: string | null; echec: boolean }) {
  const [etat, action, enCours] = useActionState(mettreAJourTableauMateriel, { succes: true } as EtatAction);
  return (
    <section className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-white p-3 text-sm shadow-sm">
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-brand-accent hover:underline">
          <IconBrandGoogleDrive size={18} aria-hidden /> Ouvrir le tableau dans le Drive
        </a>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <IconBrandGoogleDrive size={18} aria-hidden /> Tableau pas encore créé
        </span>
      )}
      {majLe && !echec && <span className="text-xs text-slate-500">À jour le {majLe}</span>}
      {echec && <span className="text-xs font-medium text-status-occupee">Dernière mise à jour ratée</span>}
      <form action={action}>
        <button type="submit" disabled={enCours} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          {enCours ? "Mise à jour…" : url ? "Mettre à jour" : "Créer le tableau"}
        </button>
      </form>
      {etat.message && <span className={`text-xs ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</span>}
    </section>
  );
}
