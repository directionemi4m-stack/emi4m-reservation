"use client";

import type { ReactNode } from "react";

// Petit bouton d'action (supprimer, retirer…) qui demande confirmation avant d'agir.
export function BoutonConfirme({ action, id, question, children }: { action: (fd: FormData) => Promise<void>; id: string; question: string; children: ReactNode }) {
  return (
    <form action={action} onSubmit={(e) => !window.confirm(question) && e.preventDefault()}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="inline-flex items-center gap-1 px-1 text-xs text-slate-400 hover:text-status-occupee">
        {children}
      </button>
    </form>
  );
}
