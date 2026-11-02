"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { IconCamera, IconFileTypePdf, IconPhoto, IconX } from "@tabler/icons-react";
import { analyserFacture, archiverFacture, type PropositionLue } from "@/app/(app)/admin/achats/actions";
import { nomFichierFacture, normaliserNomFichier } from "@/lib/factures";
import { reduirePhoto } from "@/lib/imageNavigateur";

const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";
const boutonSecondaire =
  "flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60";

export interface OptionBien {
  id: string;
  libelle: string;
}

// Choix de biens de l'inventaire à rattacher à une facture (étiquettes retirables).
export function ChoixBiens({
  biens,
  choisis,
  onChange,
}: {
  biens: OptionBien[];
  choisis: string[];
  onChange: (ids: string[]) => void;
}) {
  const restants = biens.filter((b) => !choisis.includes(b.id));
  return (
    <div className="flex flex-col gap-1">
      {choisis.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {choisis.map((id) => (
            <span key={id} className="flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-2 pr-1 text-xs text-slate-700">
              {biens.find((b) => b.id === id)?.libelle ?? "?"}
              <button type="button" onClick={() => onChange(choisis.filter((c) => c !== id))} aria-label="Retirer">
                <IconX size={12} aria-hidden />
              </button>
              <input type="hidden" name="articleIds" value={id} />
            </span>
          ))}
        </div>
      )}
      <select value="" onChange={(e) => e.target.value && onChange([...choisis, e.target.value])} className={`${champClass} py-1.5`}>
        <option value="">Rattacher à un bien de l&apos;inventaire…</option>
        {restants.map((b) => (
          <option key={b.id} value={b.id}>
            {b.libelle}
          </option>
        ))}
      </select>
    </div>
  );
}

type Fichiers = { type: "pdf"; fichier: File } | { type: "photos"; pages: Blob[] };

// Archive une facture : 1) choisir un PDF ou photographier le papier, 2) vérifier la date,
// l'entreprise, le montant et le nom proposés (lus par Claude sur la photo ou le PDF),
// 3) valider. Rien n'est enregistré avant la validation.
export function AjoutFacture({
  biens,
  fournisseurs,
  biensInitiaux = [],
}: {
  biens: OptionBien[];
  fournisseurs: string[];
  biensInitiaux?: string[];
}) {
  const [fichiers, setFichiers] = useState<Fichiers | null>(null);
  const [date, setDate] = useState("");
  const [fournisseur, setFournisseur] = useState("");
  const [montant, setMontant] = useState("");
  const [objet, setObjet] = useState("");
  const [nomSaisi, setNomSaisi] = useState("");
  const [nomManuel, setNomManuel] = useState(false);
  const [articleIds, setArticleIds] = useState<string[]>(biensInitiaux);
  const [apercu, setApercu] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [lecture, setLecture] = useState<PropositionLue["lecture"] | null>(null);
  const [analyse, demarrerAnalyse] = useTransition();
  const [envoi, demarrerEnvoi] = useTransition();
  const pdfRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const galerieRef = useRef<HTMLInputElement>(null);

  // Tant qu'il n'a pas été retouché à la main, le nom suit la date et l'entreprise.
  const nom = nomManuel ? nomSaisi : date ? nomFichierFacture(date, fournisseur) : "";

  useEffect(() => () => {
    if (apercu) URL.revokeObjectURL(apercu);
  }, [apercu]);

  function reinitialiser() {
    setFichiers(null);
    setDate("");
    setFournisseur("");
    setMontant("");
    setObjet("");
    setNomSaisi("");
    setNomManuel(false);
    setArticleIds(biensInitiaux);
    setApercu(null);
    setLecture(null);
  }

  // Envoie la facture à la lecture (Claude, ou le texte du PDF) et pré-remplit les champs.
  function lire(fichiersALire: Blob[]) {
    const donnees = new FormData();
    fichiersALire.forEach((f, i) => donnees.append("fichiers", f, f instanceof File ? f.name : `page-${i + 1}.jpg`));
    demarrerAnalyse(async () => {
      const p = await analyserFacture(donnees);
      setLecture(p.lecture);
      setDate(p.date ?? "");
      if (p.fournisseur) setFournisseur(p.fournisseur);
      if (p.montantCentimes != null) setMontant((p.montantCentimes / 100).toFixed(2).replace(".", ","));
      if (p.objet) setObjet(p.objet);
    });
  }

  function choisirPdf(f: File | undefined) {
    if (!f) return;
    setMessage(null);
    setFichiers({ type: "pdf", fichier: f });
    setApercu(URL.createObjectURL(f));
    lire([f]);
  }

  async function ajouterPhotos(liste: FileList | null) {
    if (!liste?.length) return;
    setMessage(null);
    try {
      const reduites = await Promise.all([...liste].map((f) => reduirePhoto(f, 2000)));
      const avant = fichiers?.type === "photos" ? fichiers.pages : [];
      setFichiers({ type: "photos", pages: [...avant, ...reduites] });
      // Lecture automatique dès les premières photos ; pour une page ajoutée ensuite, le
      // bouton « Relire la facture » relance la lecture sur toutes les pages.
      if (avant.length === 0) lire(reduites);
    } catch {
      setMessage({ ok: false, texte: "Cette photo n'a pas pu être lue (format non pris en charge)." });
    }
  }

  function archiver() {
    if (!fichiers) return;
    const donnees = new FormData();
    if (fichiers.type === "pdf") donnees.append("fichiers", fichiers.fichier);
    else fichiers.pages.forEach((p, i) => donnees.append("fichiers", p, `page-${i + 1}.jpg`));
    donnees.set("date", date);
    donnees.set("fournisseur", fournisseur);
    donnees.set("montant", montant);
    donnees.set("objet", objet);
    donnees.set("nomFichier", normaliserNomFichier(nom));
    articleIds.forEach((id) => donnees.append("articleIds", id));
    demarrerEnvoi(async () => {
      const r = await archiverFacture(donnees);
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
            <IconFileTypePdf size={16} aria-hidden /> Facture PDF
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

  const libelle = (texte: string, enfant: React.ReactNode) => (
    <label className="flex flex-col gap-1 text-xs text-slate-500">
      {texte}
      {enfant}
    </label>
  );

  return (
    <div className="flex flex-col gap-3 rounded-md border border-brand-accent/30 bg-sky-50/40 p-3">
      {inputs}
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        {fichiers.type === "pdf" ? (
          <>
            <IconFileTypePdf size={18} aria-hidden />
            <span className="truncate">{fichiers.fichier.name}</span>
            {apercu && (
              <a href={apercu} target="_blank" rel="noreferrer" className="text-xs text-brand-accent underline">
                Voir
              </a>
            )}
          </>
        ) : (
          <>
            <span>
              {fichiers.pages.length} page{fichiers.pages.length > 1 ? "s" : ""} photographiée{fichiers.pages.length > 1 ? "s" : ""}
            </span>
            <button type="button" onClick={() => photoRef.current?.click()} className={boutonSecondaire}>
              <IconCamera size={14} aria-hidden /> Page suivante
            </button>
            {fichiers.pages.length > 1 && (
              <button type="button" disabled={analyse} onClick={() => lire(fichiers.pages)} className={boutonSecondaire}>
                Relire la facture
              </button>
            )}
          </>
        )}
      </div>

      {analyse ? (
        <p className="text-sm text-slate-500">Lecture de la facture…</p>
      ) : (
        <>
          {lecture && (
            <p className={`text-xs ${lecture === "aucune" ? "text-amber-700" : "text-slate-500"}`}>
              {lecture === "claude"
                ? "Champs remplis par Claude à partir de la facture : vérifiez-les avant de valider."
                : lecture === "texte"
                  ? "Champs remplis à partir du texte du PDF : vérifiez-les avant de valider."
                  : "La facture n'a pas pu être lue : remplissez les champs."}
            </p>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {libelle("Date de la facture", <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={champClass} />)}
            {libelle(
              "Entreprise",
              <>
                <input list="fournisseurs-connus" required value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} className={champClass} />
                <datalist id="fournisseurs-connus">
                  {fournisseurs.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </>
            )}
            {libelle("Montant TTC (€)", <input inputMode="decimal" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="49,80" className={champClass} />)}
          </div>
          {libelle("Objet", <input value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="Cordes, partitions, réparation…" className={champClass} />)}
          <ChoixBiens biens={biens} choisis={articleIds} onChange={setArticleIds} />
          {libelle(
            nomManuel ? "Nom du fichier (modifié à la main)" : "Nom du fichier (proposé automatiquement, modifiable)",
            <input
              value={nom}
              onChange={(e) => {
                setNomSaisi(e.target.value);
                setNomManuel(true);
              }}
              className={`${champClass} font-mono text-xs`}
            />
          )}
          {nomManuel && (
            <button type="button" onClick={() => setNomManuel(false)} className="w-fit text-xs text-slate-500 underline">
              Revenir au nom automatique
            </button>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={envoi || !date || !fournisseur.trim()}
              onClick={archiver}
              className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-60"
            >
              {envoi ? "Archivage…" : "Valider et archiver"}
            </button>
            <button type="button" disabled={envoi} onClick={reinitialiser} className={boutonSecondaire}>
              Annuler
            </button>
          </div>
        </>
      )}
      {message && <p className={`text-sm ${message.ok ? "text-status-dispo" : "text-status-occupee"}`}>{message.texte}</p>}
    </div>
  );
}
