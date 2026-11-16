"use client";

import { useRef, useState, useTransition } from "react";
import { IconCamera, IconFileTypePdf, IconPhoto } from "@tabler/icons-react";
import { analyserDevisRecu, archiverDevisRecu } from "@/app/(app)/admin/devis/actions";
import { reduirePhoto } from "@/lib/imageNavigateur";

const champClass =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";
const boutonSecondaire =
  "flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60";

type Fichiers = { type: "pdf"; fichier: File } | { type: "photos"; pages: Blob[] };

// Dépôt d'un devis fournisseur : PDF (fournisseur, date et montant proposés d'après son
// texte) ou photos, puis archivage dans le Drive « Devis reçus / année / En attente ».
export function AjoutDevisRecu({ fournisseurs }: { fournisseurs: string[] }) {
  const [fichiers, setFichiers] = useState<Fichiers | null>(null);
  const [fournisseur, setFournisseur] = useState("");
  const [date, setDate] = useState("");
  const [montant, setMontant] = useState("");
  const [objet, setObjet] = useState("");
  const [validite, setValidite] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [analyse, demarrerAnalyse] = useTransition();
  const [envoi, demarrerEnvoi] = useTransition();
  const pdfRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const galerieRef = useRef<HTMLInputElement>(null);
  const aujourdHui = () => new Date().toLocaleDateString("fr-CA");

  function reinitialiser() {
    setFichiers(null);
    setFournisseur("");
    setDate("");
    setMontant("");
    setObjet("");
    setValidite("");
  }

  function choisirPdf(f: File | undefined) {
    if (!f) return;
    setMessage(null);
    setFichiers({ type: "pdf", fichier: f });
    setDate(aujourdHui());
    const donnees = new FormData();
    donnees.append("fichiers", f);
    demarrerAnalyse(async () => {
      const p = await analyserDevisRecu(donnees);
      if (p.fournisseur) setFournisseur(p.fournisseur);
      if (p.date) setDate(p.date);
      if (p.montantCentimes != null) setMontant((p.montantCentimes / 100).toFixed(2).replace(".", ","));
    });
  }

  async function ajouterPhotos(liste: FileList | null) {
    if (!liste?.length) return;
    setMessage(null);
    try {
      const reduites = await Promise.all([...liste].map((f) => reduirePhoto(f, 2000)));
      setFichiers((avant) => ({ type: "photos", pages: [...(avant?.type === "photos" ? avant.pages : []), ...reduites] }));
      setDate((d) => d || aujourdHui());
    } catch {
      setMessage({ ok: false, texte: "Cette photo n'a pas pu être lue (format non pris en charge)." });
    }
  }

  function archiver() {
    if (!fichiers) return;
    const donnees = new FormData();
    if (fichiers.type === "pdf") donnees.append("fichiers", fichiers.fichier);
    else fichiers.pages.forEach((p, i) => donnees.append("fichiers", p, `page-${i + 1}.jpg`));
    donnees.set("fournisseur", fournisseur);
    donnees.set("date", date);
    donnees.set("montant", montant);
    donnees.set("objet", objet);
    donnees.set("valableJusquAu", validite);
    demarrerEnvoi(async () => {
      const r = await archiverDevisRecu(donnees);
      setMessage({ ok: r.succes, texte: r.message ?? "" });
      if (r.succes) reinitialiser();
    });
  }

  const inputs = (
    <>
      <input ref={pdfRef} type="file" accept="application/pdf" hidden onChange={(e) => { choisirPdf(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={photoRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { ajouterPhotos(e.target.files); e.target.value = ""; }} />
      <input ref={galerieRef} type="file" accept="image/*" multiple hidden onChange={(e) => { ajouterPhotos(e.target.files); e.target.value = ""; }} />
    </>
  );

  if (!fichiers) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => pdfRef.current?.click()} className={boutonSecondaire}>
            <IconFileTypePdf size={16} aria-hidden /> PDF du devis
          </button>
          <button type="button" onClick={() => photoRef.current?.click()} className={boutonSecondaire}>
            <IconCamera size={16} aria-hidden /> Photographier
          </button>
          <button type="button" onClick={() => galerieRef.current?.click()} className={boutonSecondaire}>
            <IconPhoto size={16} aria-hidden /> Choisir des photos
          </button>
        </div>
        {inputs}
        {message && <p className={`text-sm ${message.ok ? "text-status-dispo" : "text-status-occupee"}`}>{message.texte}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-brand-accent/30 bg-sky-50/40 p-3">
      {inputs}
      <p className="text-sm text-slate-600">
        {fichiers.type === "pdf" ? fichiers.fichier.name : `${fichiers.pages.length} page${fichiers.pages.length > 1 ? "s" : ""} photographiée${fichiers.pages.length > 1 ? "s" : ""}`}
        {fichiers.type === "photos" && (
          <button type="button" onClick={() => photoRef.current?.click()} className="ml-2 text-xs text-brand-accent underline">
            page suivante
          </button>
        )}
      </p>
      {analyse ? (
        <p className="text-sm text-slate-500">Lecture du devis…</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Fournisseur
            <input list="fournisseurs-devis" value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} className={champClass} />
            <datalist id="fournisseurs-devis">
              {fournisseurs.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Date du devis
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={champClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Montant TTC (€)
            <input inputMode="decimal" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="Facultatif" className={champClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Valable jusqu&apos;au
            <input type="date" value={validite} onChange={(e) => setValidite(e.target.value)} className={champClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
            Objet
            <input value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="Ex. réparation du piano de Lans" className={champClass} />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" disabled={envoi || !fournisseur.trim()} onClick={archiver} className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60">
              {envoi ? "Archivage…" : "Archiver le devis"}
            </button>
            <button type="button" disabled={envoi} onClick={reinitialiser} className={boutonSecondaire}>
              Annuler
            </button>
          </div>
        </div>
      )}
      {message && <p className={`text-sm ${message.ok ? "text-status-dispo" : "text-status-occupee"}`}>{message.texte}</p>}
    </div>
  );
}
