"use client";

import { IconPrinter } from "@tabler/icons-react";

// Ouvre la fenêtre d'impression du navigateur (qui propose aussi « Enregistrer en PDF »).
export function BoutonImprimer({ libelle = "Imprimer ou enregistrer en PDF" }: { libelle?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-md bg-brand-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-accent/90 print:hidden"
    >
      <IconPrinter size={16} aria-hidden />
      {libelle}
    </button>
  );
}
