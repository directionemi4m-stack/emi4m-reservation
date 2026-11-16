"use client";

import { useActionState } from "react";
import { IconFileTypePdf } from "@tabler/icons-react";
import { signerPourLaPresidence, type EtatAction } from "@/app/signature-presidence/[jeton]/actions";
import { PadSignature } from "@/components/bulletins/PadSignature";

export interface DocumentPresidence {
  id: string;
  prof: string;
  titre: string;
}

// La présidence lit les documents, coche ceux qu'elle signe, paraphe et signe une fois pour tous.
export function SignaturePresidence({ jeton, documents }: { jeton: string; documents: DocumentPresidence[] }) {
  const [etat, action, enCours] = useActionState(signerPourLaPresidence, { succes: true } as EtatAction);
  if (etat.succes && etat.message) return <p className="rounded-md bg-status-dispo/10 p-4 text-sm font-medium text-emerald-800">✓ {etat.message}</p>;
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="jeton" value={jeton} />
      <section className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-slate">1. Lisez les documents, puis cochez ceux que vous signez</h2>
        <ul className="flex flex-col divide-y divide-slate-100">
          {documents.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <label className="flex min-w-0 items-start gap-2 text-sm text-slate-800">
                <input type="checkbox" name="ids" value={d.id} defaultChecked className="mt-0.5 h-5 w-5 accent-brand-accent" />
                <span>
                  <strong>{d.prof}</strong>
                  <span className="block text-xs text-slate-500">{d.titre}</span>
                </span>
              </label>
              <a href={`/signature-presidence/${jeton}/document/${d.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700">
                <IconFileTypePdf size={14} aria-hidden /> Lire
              </a>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-brand-slate">2. Votre paraphe (vos initiales), reporté sur chaque page</span>
          <PadSignature nom="paraphe" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-brand-slate">3. Votre signature</span>
          <PadSignature nom="signature" />
        </div>
        <label className="flex items-start gap-2 text-sm text-slate-800">
          <input type="checkbox" name="lu" required className="mt-0.5 h-5 w-5 accent-brand-accent" />
          <span>
            <strong>Lu et approuvé.</strong> J&apos;ai lu les documents cochés et je les signe pour l&apos;EMI4M.
          </span>
        </label>
      </section>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enCours} className="rounded-md bg-brand-accent px-5 py-3 text-base font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60">
          {enCours ? "Signature…" : "Signer les documents cochés"}
        </button>
        {etat.message && !etat.succes && <p className="text-sm text-status-occupee">{etat.message}</p>}
      </div>
    </form>
  );
}
