"use client";

import { useActionState, useState } from "react";
import { IconMail } from "@tabler/icons-react";
import { envoyerDevis, envoyerFacture, type EtatAction } from "@/app/(app)/admin/devis/actions";

const champClass =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

// Envoi du devis ou de la facture par mail, PDF joint : la direction relit le texte avant.
export function EnvoiMailForm({
  type,
  id,
  a,
  sujet,
  message,
  dejaEnvoye,
}: {
  type: "DEVIS" | "FACTURE";
  id: string;
  a: string;
  sujet: string;
  message: string;
  dejaEnvoye: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  // Le formulaire se referme une fois le mail parti.
  const [etat, action, enCours] = useActionState(async (precedent: EtatAction, fd: FormData) => {
    const r = await (type === "DEVIS" ? envoyerDevis : envoyerFacture)(precedent, fd);
    if (r.succes) setOuvert(false);
    return r;
  }, { succes: true } as EtatAction);
  if (!ouvert) {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setOuvert(true)}
          className="inline-flex w-fit items-center gap-1.5 rounded-md bg-brand-accent px-3 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90"
        >
          <IconMail size={16} aria-hidden /> {dejaEnvoye ? "Renvoyer par mail" : "Envoyer par mail"}
        </button>
        {etat.message && <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>}
      </div>
    );
  }
  return (
    <form
      action={action}
      className="flex flex-col gap-2 rounded-lg border border-brand-accent/30 bg-sky-50/40 p-3"
    >
      <input type="hidden" name="id" value={id} />
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        À
        <input name="a" type="email" required defaultValue={a} className={champClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Objet du mail
        <input name="sujet" defaultValue={sujet} className={champClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Message (le PDF est joint ; la réponse arrive sur l&apos;adresse de la direction)
        <textarea name="message" rows={7} defaultValue={message} className={champClass} />
      </label>
      {etat.message && !etat.succes && <p className="text-sm text-status-occupee">{etat.message}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={enCours} className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60">
          {enCours ? "Envoi…" : "Envoyer"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} className="text-sm text-slate-500 hover:underline">
          Annuler
        </button>
      </div>
    </form>
  );
}
