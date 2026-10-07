"use client";

import { useEffect, useState, useTransition } from "react";
import { revelerMonCode } from "@/app/(app)/securite/actions";

const DUREE_AFFICHAGE_MS = 30_000;

export function MonCodeAlarme({ aUnCode }: { aUnCode: boolean }) {
  const [code, setCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  // Le code se remasque tout seul : on ne le laisse pas affiché sur un écran oublié.
  useEffect(() => {
    if (!code) return;
    const minuteur = setTimeout(() => setCode(null), DUREE_AFFICHAGE_MS);
    return () => clearTimeout(minuteur);
  }, [code]);

  if (!aUnCode) {
    return (
      <p className="text-sm text-slate-500">
        Aucun code enregistré pour vous pour l&apos;instant. Demandez-le à la direction.
      </p>
    );
  }

  function afficher() {
    setMessage(null);
    demarrer(async () => {
      const resultat = await revelerMonCode();
      if (resultat.code) setCode(resultat.code);
      else setMessage(resultat.message ?? "Code indisponible.");
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-3">
        <span className="rounded-md bg-slate-100 px-4 py-2 font-mono text-2xl tracking-[0.3em] text-brand-slate">
          {code ?? "••••"}
        </span>
        {code ? (
          <button
            type="button"
            onClick={() => setCode(null)}
            className="text-sm font-medium text-brand-accent hover:underline"
          >
            Masquer
          </button>
        ) : (
          <button
            type="button"
            onClick={afficher}
            disabled={enCours}
            className="rounded-md bg-brand-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60"
          >
            {enCours ? "…" : "Afficher mon code"}
          </button>
        )}
      </div>
      {code && <p className="text-xs text-slate-400">Se masque automatiquement dans 30 secondes.</p>}
      {message && <p className="text-sm text-status-occupee">{message}</p>}
    </div>
  );
}
