"use client";

import { useActionState } from "react";
import { IconMail } from "@tabler/icons-react";
import { envoyerCopie, type EtatAction } from "@/app/(app)/admin/achats/occasion/actions";

// Envoi (ou renvoi) au vendeur de son exemplaire signé, par mail.
export function EnvoiCopieVendeur({ id, email, dejaEnvoyee }: { id: string; email: string; dejaEnvoyee: string | null }) {
  const [etat, action, enCours] = useActionState(envoyerCopie, { succes: true } as EtatAction);
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="a"
          type="email"
          required
          defaultValue={email}
          placeholder="Adresse mail du vendeur"
          aria-label="Adresse mail du vendeur"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
        />
        <button type="submit" disabled={enCours} className="inline-flex items-center gap-1.5 rounded-md bg-brand-accent px-3 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60">
          <IconMail size={16} aria-hidden /> {enCours ? "Envoi…" : dejaEnvoyee ? "Renvoyer sa copie" : "Envoyer sa copie au vendeur"}
        </button>
      </div>
      {dejaEnvoyee && !etat.message && <p className="text-xs text-slate-500">{dejaEnvoyee}</p>}
      {etat.message && <p className={`text-xs ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>}
    </form>
  );
}
