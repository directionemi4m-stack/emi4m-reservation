"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  enregistrerCodeAlarme,
  revelerCodeAlarme,
  supprimerCodeAlarme,
  type EtatAction,
} from "@/app/(app)/admin/parametres/securite/actions";
import { BoutonConfirmation } from "@/components/admin/BoutonConfirmation";

const ETAT_INITIAL: EtatAction = { succes: true };

export function CodeAlarmeLigne({ userId, defini }: { userId: string; defini: boolean }) {
  const [etat, enregistrer, enCours] = useActionState(enregistrerCodeAlarme, ETAT_INITIAL);
  const [, supprimer, suppressionEnCours] = useActionState(supprimerCodeAlarme, ETAT_INITIAL);
  const [code, setCode] = useState<string | null>(null);
  const [lecture, demarrer] = useTransition();

  useEffect(() => {
    if (!code) return;
    const minuteur = setTimeout(() => setCode(null), 15_000);
    return () => clearTimeout(minuteur);
  }, [code]);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {defini && (
          <button
            type="button"
            disabled={lecture}
            onClick={() =>
              code
                ? setCode(null)
                : demarrer(async () => {
                    const r = await revelerCodeAlarme(userId);
                    setCode(r.code ?? r.message ?? null);
                  })
            }
            className="font-mono text-xs text-brand-accent hover:underline disabled:opacity-60"
          >
            {code ?? "Afficher"}
          </button>
        )}
        <form action={enregistrer} className="flex items-center gap-2">
          <input type="hidden" name="userId" value={userId} />
          <input
            type="password"
            name="code"
            required
            autoComplete="new-password"
            placeholder={defini ? "Nouveau code" : "Code"}
            className="w-28 rounded-md border border-slate-300 px-2 py-1 font-mono text-sm focus:border-brand-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={enCours}
            className="rounded-md bg-brand-accent px-3 py-1 text-xs font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60"
          >
            {defini ? "Remplacer" : "Enregistrer"}
          </button>
        </form>
        {defini && (
          <form action={supprimer}>
            <input type="hidden" name="userId" value={userId} />
            <BoutonConfirmation
              message="Supprimer ce code d'alarme ?"
              disabled={suppressionEnCours}
              className="text-xs text-slate-400 hover:text-status-occupee"
            >
              ✕
            </BoutonConfirmation>
          </form>
        )}
      </div>
      {etat.message && (
        <p className={`text-xs ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>
      )}
    </div>
  );
}
