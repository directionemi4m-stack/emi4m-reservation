"use client";

import { IconPrinter } from "@tabler/icons-react";

export function BoutonImprimer() {
  return (
    <div className="flex flex-wrap items-center gap-3 print:hidden">
      <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white">
        <IconPrinter size={16} aria-hidden /> Imprimer ou enregistrer en PDF
      </button>
      <span className="text-xs text-slate-500">Conseil : orientation paysage.</span>
    </div>
  );
}
