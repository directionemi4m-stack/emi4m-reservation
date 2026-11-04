"use client";

import { useState, useTransition } from "react";
import { IconTable } from "@tabler/icons-react";
import { mettreAJourRegistre } from "@/app/(app)/admin/conventions/actions";

// Lien vers le tableur registre du Drive, et bouton pour le réécrire à la demande (il se
// met aussi à jour tout seul à chaque changement).
export function BoutonRegistreConventions({ url }: { url: string | null }) {
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-brand-accent hover:underline">
          <IconTable size={16} aria-hidden /> Ouvrir le registre (Google Sheets)
        </a>
      )}
      <button
        type="button"
        disabled={enCours}
        onClick={() =>
          demarrer(async () => {
            const r = await mettreAJourRegistre();
            setMessage({ ok: r.succes, texte: r.message ?? "" });
          })
        }
        className="text-xs text-slate-500 underline disabled:opacity-60"
      >
        {enCours ? "Mise à jour…" : url ? "Mettre à jour le registre" : "Créer le registre dans le Drive"}
      </button>
      {message && <span className={`text-xs ${message.ok ? "text-status-dispo" : "text-status-occupee"}`}>{message.texte}</span>}
    </div>
  );
}
