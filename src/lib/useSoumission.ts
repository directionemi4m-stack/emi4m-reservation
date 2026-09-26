"use client";

import { useActionState, useTransition, type FormEvent } from "react";

export type EtatSoumission = { succes: boolean; message?: string };

// Comme useActionState + <form action>, mais SANS la remise à zéro automatique des champs
// que React 19 applique après chaque action : avec elle, un menu ou un champ repasse à sa
// valeur d'origine dès que l'action se termine — y compris quand elle est refusée (l'admin
// perd sa saisie) ou juste avant un second envoi (qui réécrit alors l'ancienne valeur).
// Ici les champs gardent ce que l'utilisateur a saisi ; c'est la page rechargée par le
// serveur qui affiche les valeurs enregistrées.
export function useSoumission(
  action: (etatPrecedent: EtatSoumission, formData: FormData) => Promise<EtatSoumission>,
  etatInitial: EtatSoumission
) {
  const [etat, dispatch, enCours] = useActionState(action, etatInitial);
  const [, demarrer] = useTransition();

  function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const donnees = new FormData(evenement.currentTarget);
    demarrer(() => dispatch(donnees));
  }

  return [etat, soumettre, enCours] as const;
}
