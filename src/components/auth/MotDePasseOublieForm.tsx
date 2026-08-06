"use client";

import { useActionState } from "react";
import {
  demanderReinitialisation,
  type EtatDemandeReinitialisation,
} from "@/app/(auth)/mot-de-passe-oublie/actions";

const ETAT_INITIAL: EtatDemandeReinitialisation = { statut: "idle" };

export function MotDePasseOublieForm() {
  const [etat, action, enCours] = useActionState(demanderReinitialisation, ETAT_INITIAL);

  if (etat.statut === "envoye") {
    return (
      <p className="rounded-md bg-status-dispo/10 px-4 py-3 text-sm text-slate-700">
        Si un compte existe avec cette adresse, un email vient de lui être envoyé.
      </p>
    );
  }

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
      <button
        type="submit"
        disabled={enCours}
        className="rounded-md bg-brand-accent px-4 py-2 font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
      >
        {enCours ? "Envoi en cours…" : "Recevoir le lien"}
      </button>
    </form>
  );
}
