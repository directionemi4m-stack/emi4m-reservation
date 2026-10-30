"use client";

import { useRef, useState, useTransition } from "react";
import { IconCamera, IconFileTypePdf, IconPhoto } from "@tabler/icons-react";
import { deposerDocument } from "@/app/(app)/admin/locations/actions";
import { reduirePhoto } from "@/lib/imageNavigateur";

const LIBELLES = ["Contrat de location", "Attestation d'assurance", "Caution", "Règlement", "Autre"];

// 2000 px de côté : lisible une fois archivé en PDF.
const compresser = (fichier: File) => reduirePhoto(fichier, 2000);

// Archive un document rendu par la famille : un PDF, ou une ou plusieurs photos du papier
// (une page par photo) regroupées en un seul PDF dans le dossier Drive de la location.
export function AjoutDocument({ locationId }: { locationId: string }) {
  const [pages, setPages] = useState<Blob[]>([]);
  const [libelle, setLibelle] = useState(LIBELLES[0]);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  const pdfRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const galerieRef = useRef<HTMLInputElement>(null);

  function envoyer(fichiers: Blob[], noms: string[]) {
    const donnees = new FormData();
    donnees.set("locationId", locationId);
    donnees.set("libelle", libelle);
    fichiers.forEach((f, i) => donnees.append("fichiers", f, noms[i]));
    demarrer(async () => {
      const r = await deposerDocument(donnees);
      setMessage({ ok: r.succes, texte: r.message ?? "" });
      if (r.succes) setPages([]);
    });
  }

  async function ajouterPhotos(liste: FileList | null) {
    if (!liste?.length) return;
    setMessage(null);
    try {
      const reduites = await Promise.all([...liste].map(compresser));
      setPages((p) => [...p, ...reduites]);
    } catch {
      setMessage({ ok: false, texte: "Cette photo n'a pas pu être lue (format non pris en charge)." });
    }
  }

  const bouton =
    "flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60";

  return (
    <div className="flex flex-col gap-2 rounded-md bg-slate-50 p-3">
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        Type de document
        <select
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
        >
          {LIBELLES.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={enCours} onClick={() => photoRef.current?.click()} className={bouton}>
          <IconCamera size={16} aria-hidden /> Prendre une photo
        </button>
        <button type="button" disabled={enCours} onClick={() => galerieRef.current?.click()} className={bouton}>
          <IconPhoto size={16} aria-hidden /> Choisir des photos
        </button>
        <button type="button" disabled={enCours} onClick={() => pdfRef.current?.click()} className={bouton}>
          <IconFileTypePdf size={16} aria-hidden /> Ajouter un PDF
        </button>
      </div>

      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          ajouterPhotos(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={galerieRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          ajouterPhotos(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={pdfRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) envoyer([f], [f.name]);
          e.target.value = "";
        }}
      />

      {pages.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-600">
            {pages.length} page{pages.length > 1 ? "s" : ""} prête{pages.length > 1 ? "s" : ""}
          </span>
          <button
            type="button"
            disabled={enCours}
            onClick={() => envoyer(pages, pages.map((_, i) => `page-${i + 1}.jpg`))}
            className="rounded-md bg-brand-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60"
          >
            Archiver en PDF
          </button>
          <button type="button" disabled={enCours} onClick={() => setPages([])} className="text-xs text-slate-500 underline">
            Annuler
          </button>
          <span className="w-full text-xs text-slate-400">Document de plusieurs pages ? Reprenez une photo par page avant d&apos;archiver.</span>
        </div>
      )}

      {enCours && <p className="text-xs text-slate-500">Archivage en cours…</p>}
      {message && <p className={`text-xs ${message.ok ? "text-status-dispo" : "text-status-occupee"}`}>{message.texte}</p>}
    </div>
  );
}
