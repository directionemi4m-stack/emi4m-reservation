"use client";

import { useRef, useState } from "react";
import { IconCamera, IconFileTypePdf, IconPhoto } from "@tabler/icons-react";
import { reduirePhoto } from "@/lib/imageNavigateur";

const bouton = "flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50";

// Choix d'un document papier : un PDF, ou une ou plusieurs photos (converties en JPEG, y
// compris les photos d'iPhone), placés dans un champ caché du formulaire.
export function ChoixScan({ nom = "fichiers", libelle }: { nom?: string; libelle: string }) {
  const champ = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const galerieRef = useRef<HTMLInputElement>(null);
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);

  function remplir(liste: File[]) {
    setFichiers(liste);
    if (!champ.current) return;
    const dt = new DataTransfer();
    liste.forEach((f) => dt.items.add(f));
    champ.current.files = dt.files;
  }

  async function photos(liste: FileList | null) {
    if (!liste?.length) return;
    setErreur(null);
    try {
      const jpeg = await Promise.all([...liste].map((f) => reduirePhoto(f, 2000)));
      const deja = fichiers.filter((f) => f.type === "image/jpeg");
      remplir([...deja, ...jpeg.map((b, i) => new File([b], `page-${deja.length + i + 1}.jpg`, { type: "image/jpeg" }))]);
    } catch {
      setErreur("Cette photo n'a pas pu être lue.");
    }
  }

  const resume =
    fichiers.length === 0
      ? null
      : fichiers[0].type === "application/pdf"
        ? fichiers[0].name
        : `${fichiers.length} page${fichiers.length > 1 ? "s" : ""} photographiée${fichiers.length > 1 ? "s" : ""}`;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-600">{libelle}</span>
      <input ref={champ} type="file" name={nom} multiple hidden />
      <input ref={pdfRef} type="file" accept="application/pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) remplir([f]); e.target.value = ""; }} />
      <input ref={photoRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { photos(e.target.files); e.target.value = ""; }} />
      <input ref={galerieRef} type="file" accept="image/*" multiple hidden onChange={(e) => { photos(e.target.files); e.target.value = ""; }} />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => pdfRef.current?.click()} className={bouton}>
          <IconFileTypePdf size={16} aria-hidden /> PDF
        </button>
        <button type="button" onClick={() => photoRef.current?.click()} className={bouton}>
          <IconCamera size={16} aria-hidden /> {fichiers.length && fichiers[0].type !== "application/pdf" ? "Page suivante" : "Photographier"}
        </button>
        <button type="button" onClick={() => galerieRef.current?.click()} className={bouton}>
          <IconPhoto size={16} aria-hidden /> Choisir des photos
        </button>
      </div>
      {resume && (
        <p className="text-xs text-slate-600">
          ✓ {resume}{" "}
          <button type="button" onClick={() => remplir([])} className="text-slate-400 underline">
            retirer
          </button>
        </p>
      )}
      {erreur && <p className="text-xs text-status-occupee">{erreur}</p>}
    </div>
  );
}
