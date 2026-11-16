"use client";

import { useActionState, useState } from "react";
import { deciderDevis, type EtatAction } from "@/app/(app)/admin/devis/actions";

const champClass =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

// Réponse du client : accepté (avec le devis signé, facultatif), refusé (motif), ou rouvert.
export function DecisionDevis({ id, statut }: { id: string; statut: "ENVOYE" | "ACCEPTE" | "REFUSE" }) {
  const [choix, setChoix] = useState<"ACCEPTE" | "REFUSE" | null>(null);
  const [etat, action, enCours] = useActionState(async (p: EtatAction, fd: FormData) => {
    const r = await deciderDevis(p, fd);
    if (r.succes) setChoix(null);
    return r;
  }, { succes: true } as EtatAction);

  if (statut !== "ENVOYE") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {statut === "ACCEPTE" && (
          <form action={action}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="decision" value="ACCEPTE" />
            <label className="text-xs text-slate-600">
              Déposer ou remplacer le devis signé :{" "}
              <input type="file" name="fichiers" accept="application/pdf,image/jpeg" multiple className="text-xs" onChange={(e) => e.target.form?.requestSubmit()} />
            </label>
          </form>
        )}
        <form
          action={action}
          onSubmit={(e) => {
            if (!window.confirm("Rouvrir ce devis (il repasse en « Envoyé ») ?")) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="decision" value="ENVOYE" />
          <button type="submit" disabled={enCours} className="text-xs text-slate-500 underline">
            Rouvrir le devis
          </button>
        </form>
        {enCours && <span className="text-xs text-slate-500">Enregistrement…</span>}
        {etat.message && <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setChoix("ACCEPTE")} className="rounded-md border border-status-dispo px-3 py-1.5 text-sm font-medium text-status-dispo hover:bg-status-dispo/10">
          ✓ Accepté par le client
        </button>
        <button type="button" onClick={() => setChoix("REFUSE")} className="rounded-md border border-status-occupee px-3 py-1.5 text-sm font-medium text-status-occupee hover:bg-status-occupee/10">
          ✕ Refusé
        </button>
      </div>
      {choix && (
        <form action={action} className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="decision" value={choix} />
          {choix === "ACCEPTE" ? (
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Devis signé par le client (PDF ou photos, facultatif) : archivé dans le Drive
              <input type="file" name="fichiers" accept="application/pdf,image/jpeg" multiple className="text-sm" />
            </label>
          ) : (
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Motif (facultatif)
              <input name="motif" placeholder="Ex. budget, autre prestataire, date impossible" className={champClass} />
            </label>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={enCours} className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60">
              {enCours ? "Enregistrement…" : choix === "ACCEPTE" ? "Marquer accepté" : "Marquer refusé"}
            </button>
            <button type="button" onClick={() => setChoix(null)} className="text-sm text-slate-500 hover:underline">
              Annuler
            </button>
          </div>
        </form>
      )}
      {etat.message && <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>}
    </div>
  );
}
