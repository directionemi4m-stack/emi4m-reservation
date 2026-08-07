"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  televerserDocument,
  supprimerDocument,
  type EtatAction,
} from "@/app/(app)/frais/actions";
import type { TypeDocument } from "@/generated/prisma/client";

const ETAT_INITIAL: EtatAction = { succes: true };

interface Document {
  nomFichier: string;
  driveUrl: string;
}

export function DocumentUploadForm({
  type,
  label,
  document,
}: {
  type: TypeDocument;
  label: string;
  document: Document | null;
}) {
  const [etatEnvoi, actionEnvoi, enCoursEnvoi] = useActionState(televerserDocument, ETAT_INITIAL);
  const [etatSuppr, actionSuppr, enCoursSuppr] = useActionState(supprimerDocument, ETAT_INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (etatEnvoi.succes) formRef.current?.reset();
  }, [etatEnvoi]);

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-brand-slate">{label}</h3>

      {document ? (
        <div className="flex items-center justify-between gap-3">
          <a
            href={document.driveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-sm text-brand-accent hover:underline"
          >
            {document.nomFichier}
          </a>
          <form action={actionSuppr}>
            <input type="hidden" name="type" value={type} />
            <button
              type="submit"
              disabled={enCoursSuppr}
              className="shrink-0 text-xs text-slate-400 hover:text-status-occupee disabled:opacity-60"
            >
              Supprimer
            </button>
          </form>
        </div>
      ) : (
        <p className="text-xs text-slate-500">Aucun document envoyé.</p>
      )}

      <form ref={formRef} action={actionEnvoi} className="flex flex-col gap-1">
        <input type="hidden" name="type" value={type} />
        <input
          type="file"
          name="fichier"
          accept="image/*,application/pdf"
          required
          disabled={enCoursEnvoi}
          onChange={() => formRef.current?.requestSubmit()}
          className="text-xs file:mr-2 file:rounded-md file:border-0 file:bg-brand-accent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
        />
        {enCoursEnvoi && <p className="text-xs text-slate-500">Envoi…</p>}
        {etatEnvoi.message && (
          <p className={etatEnvoi.succes ? "text-xs text-status-dispo" : "text-xs text-status-occupee"}>
            {etatEnvoi.message}
          </p>
        )}
        {etatSuppr.message && !etatSuppr.succes && (
          <p className="text-xs text-status-occupee">{etatSuppr.message}</p>
        )}
      </form>
    </div>
  );
}
