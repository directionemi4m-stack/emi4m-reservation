"use client";

import { useActionState, useState } from "react";
import { changerStatutDevisRecu, type EtatAction } from "@/app/(app)/admin/devis/actions";

const champClass =
  "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

// Changer l'état d'un devis reçu : signé (version signée facultative), abandonné (motif),
// ou remis en attente.
export function ActionsDevisRecu({ id, statut }: { id: string; statut: "EN_ATTENTE" | "SIGNE" | "ABANDONNE" }) {
  const [choix, setChoix] = useState<"SIGNE" | "ABANDONNE" | null>(null);
  const [etat, action, enCours] = useActionState(async (p: EtatAction, fd: FormData) => {
    const r = await changerStatutDevisRecu(p, fd);
    if (r.succes) setChoix(null);
    return r;
  }, { succes: true } as EtatAction);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {statut !== "SIGNE" && (
          <button type="button" onClick={() => setChoix("SIGNE")} className="font-medium text-status-dispo hover:underline">
            ✓ Signé
          </button>
        )}
        {statut === "SIGNE" && (
          <button type="button" onClick={() => setChoix("SIGNE")} className="text-brand-accent hover:underline">
            Déposer la version signée
          </button>
        )}
        {statut !== "ABANDONNE" && (
          <button type="button" onClick={() => setChoix("ABANDONNE")} className="text-slate-500 hover:underline">
            Abandonné
          </button>
        )}
        {statut !== "EN_ATTENTE" && (
          <form action={action}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="statut" value="EN_ATTENTE" />
            <button type="submit" disabled={enCours} className="text-slate-500 underline">
              Remettre en attente
            </button>
          </form>
        )}
      </div>
      {choix && (
        <form action={action} className="flex flex-wrap items-end gap-2 rounded-md bg-slate-50 p-2">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="statut" value={choix} />
          {choix === "SIGNE" ? (
            <label className="flex flex-col gap-1 text-xs text-slate-600">
              Version signée (PDF ou photos, facultatif)
              <input type="file" name="fichiers" accept="application/pdf,image/jpeg" multiple className="text-xs" />
            </label>
          ) : (
            <input name="motif" placeholder="Motif (ex. trop cher, autre fournisseur)" aria-label="Motif de l'abandon" className={champClass} />
          )}
          <button type="submit" disabled={enCours} className="rounded-md bg-brand-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60">
            {enCours ? "…" : "Valider"}
          </button>
          <button type="button" onClick={() => setChoix(null)} className="text-xs text-slate-500 hover:underline">
            Annuler
          </button>
        </form>
      )}
      {etat.message && !etat.succes && <p className="text-xs text-status-occupee">{etat.message}</p>}
    </div>
  );
}
