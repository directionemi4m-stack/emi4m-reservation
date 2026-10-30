"use client";

import { useActionState, useRef } from "react";
import { retirerFicheCham, televerserFicheCham, type EtatAction } from "@/app/(app)/cham/actions";
import { BoutonConfirmation } from "@/components/admin/BoutonConfirmation";

const ETAT_INITIAL: EtatAction = { succes: true };

// Réservé à la direction. Sur téléphone, le bouton propose l'appareil photo ou un
// fichier (PDF, photo déjà prise) ; l'envoi part dès le fichier choisi.
export function FicheCham({
  eleveId,
  document,
}: {
  eleveId: string;
  document: { url: string; majLe: string | null } | null;
}) {
  const [etat, envoyer, envoiEnCours] = useActionState(televerserFicheCham, ETAT_INITIAL);
  const [, retirer, retraitEnCours] = useActionState(retirerFicheCham, ETAT_INITIAL);
  const champFichier = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      {document ? (
        <a
          href={document.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-accent hover:underline"
        >
          📄 Fiche d&apos;autorisation
          {document.majLe && ` (${new Date(document.majLe).toLocaleDateString("fr-FR")})`}
        </a>
      ) : (
        <span className="text-slate-400">Aucune fiche scannée</span>
      )}
      <form action={envoyer}>
        <input type="hidden" name="id" value={eleveId} />
        <input
          ref={champFichier}
          type="file"
          name="fiche"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => e.currentTarget.files?.length && e.currentTarget.form?.requestSubmit()}
        />
        <button
          type="button"
          onClick={() => champFichier.current?.click()}
          disabled={envoiEnCours}
          className="font-medium text-brand-accent hover:underline disabled:opacity-60"
        >
          {envoiEnCours ? "Envoi…" : document ? "Remplacer la fiche" : "📷 Scanner la fiche"}
        </button>
      </form>
      {document && (
        <form action={retirer}>
          <input type="hidden" name="id" value={eleveId} />
          <BoutonConfirmation
            message="Retirer la fiche d'autorisation scannée ? Elle sera supprimée du dossier Suivi CHAM."
            disabled={retraitEnCours}
            className="font-medium text-status-occupee hover:underline disabled:opacity-60"
          >
            Retirer
          </BoutonConfirmation>
        </form>
      )}
      {etat.message && (
        <span className={etat.succes ? "text-status-dispo" : "text-status-occupee"}>
          {etat.succes ? "✓ " : ""}
          {etat.message}
        </span>
      )}
    </div>
  );
}
