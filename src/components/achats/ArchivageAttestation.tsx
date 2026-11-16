"use client";

import { useActionState } from "react";
import { archiverAttestationSignee, type EtatAction } from "@/app/(app)/admin/achats/occasion/actions";

// Dépôt de l'attestation signée par les deux parties (et de la pièce d'identité du vendeur).
export function ArchivageAttestation({ id, dejaSignee, dejaInventaire }: { id: string; dejaSignee: boolean; dejaInventaire: boolean }) {
  const [etat, action, enCours] = useActionState(archiverAttestationSignee, { succes: true } as EtatAction);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Attestation signée par les deux parties (scan PDF ou photos)
        <input type="file" name="fichiers" accept="application/pdf,image/jpeg" multiple required className="text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Copie de la pièce d&apos;identité du vendeur (facultatif, gardée dans le Drive de la direction)
        <input type="file" name="piece" accept="application/pdf,image/jpeg" multiple className="text-sm" />
      </label>
      {!dejaInventaire && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="inventaire" defaultChecked className="h-4 w-4 accent-brand-accent" />
          Ajouter le matériel à l&apos;inventaire (désignation, marque, n° de série, valeur, date d&apos;achat)
        </label>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={enCours} className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60">
          {enCours ? "Archivage…" : dejaSignee ? "Remplacer la version signée" : "Archiver l'attestation signée"}
        </button>
        {etat.message && <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>}
      </div>
    </form>
  );
}
