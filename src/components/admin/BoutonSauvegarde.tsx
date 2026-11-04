"use client";

import { useState, useTransition } from "react";
import { sauvegarderMaintenant } from "@/app/(app)/admin/parametres/google-drive/actions";

export function BoutonSauvegarde() {
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={enCours}
        onClick={() =>
          demarrer(async () => {
            const r = await sauvegarderMaintenant();
            setMessage({ ok: r.succes, texte: r.message });
          })
        }
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        {enCours ? "Sauvegarde en cours…" : "Sauvegarder maintenant"}
      </button>
      {message && <span className={`text-sm ${message.ok ? "text-status-dispo" : "text-status-occupee"}`}>{message.texte}</span>}
    </div>
  );
}
