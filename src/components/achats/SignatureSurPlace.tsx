"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { IconCamera } from "@tabler/icons-react";
import { signerSurPlace, type EtatAction } from "@/app/(app)/admin/achats/occasion/actions";
import { PadSignature } from "@/components/bulletins/PadSignature";
import { reduirePhoto } from "@/lib/imageNavigateur";

// Signature de l'attestation sur le téléphone de la direction : le vendeur relit, coche
// « Lu et approuvé, bon pour vente » et signe au doigt ; puis la direction signe.
export function SignatureSurPlace({
  id,
  vendeur,
  vendeurEmail,
  representant,
  maSignature,
  dejaInventaire,
}: {
  id: string;
  vendeur: string;
  vendeurEmail: string;
  representant: string;
  maSignature: string | null;
  dejaInventaire: boolean;
}) {
  const [etat, action, enCours] = useActionState(signerSurPlace, { succes: true } as EtatAction);
  const [piece, setPiece] = useState<string | null>(null);
  const pieceRef = useRef<HTMLInputElement>(null);

  // La photo de la pièce d'identité est convertie en JPEG (les photos d'iPhone sont en HEIC).
  async function photoPiece(fichiers: FileList | null) {
    const f = fichiers?.[0];
    if (!f || !pieceRef.current) return;
    try {
      const jpeg = await reduirePhoto(f, 2000);
      const dt = new DataTransfer();
      dt.items.add(new File([jpeg], "piece-identite.jpg", { type: "image/jpeg" }));
      pieceRef.current.files = dt.files;
      setPiece("Photo de la pièce d'identité prête.");
    } catch {
      pieceRef.current.value = "";
      setPiece("Cette photo n'a pas pu être lue.");
    }
  }

  if (etat.succes && etat.message) {
    return (
      <div className="flex flex-col gap-3 rounded-lg bg-status-dispo/10 p-4">
        <p className="text-sm font-medium text-emerald-800">✓ {etat.message}</p>
        <Link href={`/admin/achats/occasion/${id}`} className="w-fit rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white">
          Revenir à l&apos;attestation
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <section className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-slate">Le vendeur : {vendeur}</h2>
        <label className="flex items-start gap-2 text-sm text-slate-800">
          <input type="checkbox" name="luEtApprouve" required className="mt-0.5 h-5 w-5 accent-brand-accent" />
          <span>
            <strong>Lu et approuvé, bon pour vente.</strong> Je certifie être un particulier vendant à titre privé, propriétaire légitime de ce
            matériel, et avoir signalé tout défaut connu.
          </span>
        </label>
        <PadSignature nom="signatureVendeur" />
        <div className="flex flex-col gap-1">
          <input ref={pieceRef} type="file" name="piece" accept="image/*" capture="environment" hidden onChange={(e) => photoPiece(e.target.files)} />
          <button
            type="button"
            onClick={() => pieceRef.current?.click()}
            className="inline-flex w-fit items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
          >
            <IconCamera size={16} aria-hidden /> Photographier la pièce d&apos;identité (facultatif)
          </button>
          {piece && <span className="text-xs text-slate-500">{piece}</span>}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-slate">Pour l&apos;EMI4M, l&apos;acheteur{representant && ` : ${representant}`}</h2>
        {maSignature && <p className="text-xs text-slate-400">Votre dernière signature est reprise : effacez-la pour re-signer.</p>}
        <PadSignature nom="signatureAcheteur" initiale={maSignature} />
        {!dejaInventaire && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="inventaire" defaultChecked className="h-4 w-4 accent-brand-accent" />
            Ajouter le matériel à l&apos;inventaire
          </label>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <input type="checkbox" name="envoyerCopie" defaultChecked className="h-4 w-4 accent-brand-accent" />
          Envoyer son exemplaire signé au vendeur par mail
        </label>
        <input
          name="emailCopie"
          type="email"
          defaultValue={vendeurEmail}
          placeholder="Adresse mail du vendeur"
          aria-label="Adresse mail du vendeur"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
        />
        <p className="text-xs text-slate-500">Rien à imprimer : le vendeur reçoit le PDF signé, et vous gardez le vôtre dans le Drive.</p>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enCours} className="rounded-md bg-brand-accent px-5 py-3 text-base font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60">
          {enCours ? "Signature et archivage…" : "Signer et archiver"}
        </button>
        <Link href={`/admin/achats/occasion/${id}`} className="text-sm text-slate-500 hover:underline">
          Annuler
        </Link>
      </div>
      {etat.message && !etat.succes && <p className="text-sm text-status-occupee">{etat.message}</p>}
    </form>
  );
}
