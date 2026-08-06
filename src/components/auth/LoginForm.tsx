"use client";

import { useActionState } from "react";
import { demanderLien, type EtatDemandeLien } from "@/app/(auth)/login/actions";

export function LoginForm({ erreurInitiale }: { erreurInitiale?: string | null }) {
  const etatInitial: EtatDemandeLien = erreurInitiale
    ? { statut: "erreur", message: erreurInitiale }
    : { statut: "idle" };
  const [etat, action, enCours] = useActionState(demanderLien, etatInitial);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Adresse email
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="prenom.nom@exemple.fr"
          className="rounded-md border border-slate-300 px-3 py-2 text-base focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
        />
      </label>
      {etat.statut === "erreur" && <p className="text-sm text-red-600">{etat.message}</p>}
      <button
        type="submit"
        disabled={enCours}
        className="rounded-md bg-brand-accent px-4 py-2 font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
      >
        {enCours ? "Envoi en cours…" : "Recevoir le lien de connexion"}
      </button>
      <p className="text-center text-xs text-slate-400">
        Pas de mot de passe : un lien de connexion à usage unique vous sera envoyé par email.
      </p>
    </form>
  );
}
