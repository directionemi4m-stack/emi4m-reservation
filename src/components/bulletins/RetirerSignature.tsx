"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { actualiserPdfBulletin, retirerSignatureDirection } from "@/app/(app)/bulletins-cham/actions";

// Retire la signature de la direction d'un bulletin pas encore envoyé, ou de tous (sans
// eleveId). Les textes et les signatures des profs ne sont pas touchés.
export function RetirerSignature({
  periode,
  eleveId,
  question,
  libelle,
  className,
}: {
  periode: { anneeDebut: number; trimestre: number };
  eleveId?: string;
  question: string;
  libelle: string;
  className?: string;
}) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function retirer() {
    if (!window.confirm(question)) return;
    setEnCours(true);
    setErreur(null);
    const fd = new FormData();
    fd.set("anneeDebut", String(periode.anneeDebut));
    fd.set("trimestre", String(periode.trimestre));
    if (eleveId) fd.set("eleveId", eleveId);
    const r = await retirerSignatureDirection(fd);
    if (!r.succes || !r.eleveIds) setErreur(r.message ?? "Impossible de retirer la signature.");
    else for (const id of r.eleveIds) await actualiserPdfBulletin(id, periode.anneeDebut, periode.trimestre).catch(() => false);
    setEnCours(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={retirer} disabled={enCours} className={className ?? "text-xs text-slate-500 underline hover:text-status-occupee disabled:opacity-50"}>
        {enCours ? "Retrait…" : libelle}
      </button>
      {erreur && <span className="text-xs text-status-occupee">{erreur}</span>}
    </>
  );
}
