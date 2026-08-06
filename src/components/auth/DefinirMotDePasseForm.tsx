"use client";

import { useActionState } from "react";
import {
  definirMotDePasse,
  type EtatDefinitionMotDePasse,
} from "@/app/(auth)/definir-mot-de-passe/actions";

const ETAT_INITIAL: EtatDefinitionMotDePasse = { statut: "idle" };

export function DefinirMotDePasseForm({ token }: { token: string }) {
  const [etat, action, enCours] = useActionState(definirMotDePasse, ETAT_INITIAL);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Nouveau mot de passe
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-md border border-slate-300 px-3 py-2 text-base focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Confirmez le mot de passe
        <input
          type="password"
          name="confirmation"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-md border border-slate-300 px-3 py-2 text-base focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
        />
      </label>
      {etat.statut === "erreur" && <p className="text-sm text-red-600">{etat.message}</p>}
      <button
        type="submit"
        disabled={enCours}
        className="rounded-md bg-brand-accent px-4 py-2 font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
      >
        {enCours ? "Enregistrement…" : "Valider"}
      </button>
    </form>
  );
}
