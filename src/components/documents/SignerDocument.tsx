"use client";

import { useState } from "react";
import { IconCircleCheck, IconExternalLink, IconFileText } from "@tabler/icons-react";
import { useSoumission } from "@/lib/useSoumission";
import { signerDocument, type EtatAction } from "@/app/(app)/securite/actions";
import { PadSignature } from "@/components/bulletins/PadSignature";

const etatInitial: EtatAction = { succes: true };

export interface DocumentVue {
  id: string;
  titre: string;
  attestation: string;
  version: number;
  publieLe: string; // « 02/11/2026 »
  signeLe: string | null; // « 03/11/2026 » : signé (version en cours)
  versionPrecedenteSignee: boolean; // a signé une version antérieure : à re-signer
}

const lien = (d: DocumentVue) => `/api/documents/${d.id}?v=${d.version}`;

// Un document à lire et signer : 1) l'ouvrir, 2) cocher l'attestation, 3) signer au doigt.
export function SignerDocument({ document, bloque }: { document: DocumentVue; bloque: boolean }) {
  const [etat, soumettre, enCours] = useSoumission(signerDocument, etatInitial);
  const [ouvert, setOuvert] = useState(false);

  if (document.signeLe) {
    return (
      <li className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-4 shadow-sm">
        <IconCircleCheck size={22} className="text-status-dispo" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-brand-slate">{document.titre}</p>
          <p className="text-xs text-slate-500">
            Signé le {document.signeLe} · version du {document.publieLe}
          </p>
        </div>
        <a href={lien(document)} target="_blank" rel="noreferrer" className="text-xs text-brand-accent underline">
          Relire
        </a>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border-2 border-amber-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-brand-slate">{document.titre}</p>
        <p className="text-xs text-slate-500">
          {document.versionPrecedenteSignee ? "Nouvelle version" : "Version"} du {document.publieLe}, à lire et signer
        </p>
      </div>

      <a
        href={lien(document)}
        target="_blank"
        rel="noreferrer"
        onClick={() => setOuvert(true)}
        className="flex w-fit items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <IconFileText size={18} aria-hidden /> 1. Lire le document <IconExternalLink size={14} aria-hidden />
      </a>

      <form onSubmit={soumettre} className="flex flex-col gap-3">
        <input type="hidden" name="documentId" value={document.id} />
        <input type="hidden" name="version" value={document.version} />
        <label className={`flex items-start gap-2 text-sm ${ouvert ? "text-slate-700" : "text-slate-400"}`}>
          <input type="checkbox" name="lu" disabled={!ouvert || bloque} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-accent" />
          <span>
            <span className="font-medium">2.</span> {document.attestation}
            {!ouvert && <span className="block text-xs">Ouvrez d&apos;abord le document.</span>}
          </span>
        </label>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-slate-700">
            <span className="font-medium">3.</span> Signez avec le doigt ou la souris
          </p>
          <PadSignature nom="signature" desactive={!ouvert || bloque} />
        </div>
        {bloque && <p className="text-xs text-slate-500">Signature impossible en mode « connecté en tant que ».</p>}
        {etat.message && <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>}
        <button
          type="submit"
          disabled={enCours || !ouvert || bloque}
          className="w-fit rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
        >
          {enCours ? "Enregistrement…" : "Signer"}
        </button>
      </form>
    </li>
  );
}
