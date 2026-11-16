"use client";

import { useActionState } from "react";
import { IconFileTypePdf } from "@tabler/icons-react";
import { signerMonContrat, type EtatAction } from "@/app/(app)/contrats/actions";
import { PadSignature } from "@/components/bulletins/PadSignature";

// Signature d'un contrat par le prof : il le relit, paraphe (initiales) puis signe au doigt.
export function SignatureContrat({ id, lienPdf }: { id: string; lienPdf: string }) {
  const [etat, action, enCours] = useActionState(signerMonContrat, { succes: true } as EtatAction);
  if (etat.succes && etat.message) return <p className="rounded-md bg-status-dispo/10 p-3 text-sm font-medium text-emerald-800">✓ {etat.message}</p>;
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <a href={lienPdf} target="_blank" rel="noopener" className="inline-flex w-fit items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
        <IconFileTypePdf size={16} aria-hidden /> 1. Lire le document
      </a>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">2. Votre paraphe (vos initiales), reporté sur chaque page</span>
        <PadSignature nom="paraphe" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">3. Votre signature</span>
        <PadSignature nom="signature" />
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-800">
        <input type="checkbox" name="lu" required className="mt-0.5 h-5 w-5 accent-brand-accent" />
        <span>
          <strong>Lu et approuvé.</strong> J&apos;ai lu l&apos;intégralité du document et je le signe.
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enCours} className="rounded-md bg-brand-accent px-5 py-3 text-base font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60">
          {enCours ? "Signature…" : "Signer"}
        </button>
        {etat.message && !etat.succes && <p className="text-sm text-status-occupee">{etat.message}</p>}
      </div>
    </form>
  );
}
