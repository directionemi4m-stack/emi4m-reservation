"use client";

import { useRef, useState, useTransition } from "react";
import { IconCamera, IconCheck, IconFileCertificate, IconFileTypePdf, IconPhoto, IconX } from "@tabler/icons-react";
import { enregistrerConvention } from "@/app/(app)/admin/conventions/actions";
import { reduirePhoto } from "@/lib/imageNavigateur";

export interface ConventionVue {
  conventionId?: string;
  demandeCreneauId?: string;
  demandeMairieLe: string | null; // AAAA-MM-JJ
  reponseMairieLe: string | null;
  commentaire: string | null;
  fichierUrl: string | null;
}

const champClass =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";
const boutonSecondaire =
  "inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50";

const dateCourte = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const aujourdHui = () => new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });

type Fichiers = { type: "pdf"; fichier: File } | { type: "photos"; pages: Blob[] } | null;

// Convention signée avec la mairie pour une réservation (salles « à convention ») : un
// résumé d'une ligne, et le formulaire pour noter les dates et déposer le scan.
export function ConventionReservation({ convention }: { convention: ConventionVue }) {
  const [ouvert, setOuvert] = useState(false);
  const [demande, setDemande] = useState(convention.demandeMairieLe ?? "");
  const [reponse, setReponse] = useState(convention.reponseMairieLe ?? "");
  const [commentaire, setCommentaire] = useState(convention.commentaire ?? "");
  const [fichiers, setFichiers] = useState<Fichiers>(null);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  const pdfRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const galerieRef = useRef<HTMLInputElement>(null);

  function apresChoix() {
    setMessage(null);
    // Une convention signée, c'est que la mairie a répondu : date du jour proposée.
    if (!reponse) setReponse(aujourdHui());
  }

  async function ajouterPhotos(liste: FileList | null) {
    if (!liste?.length) return;
    try {
      const reduites = await Promise.all([...liste].map((f) => reduirePhoto(f, 2000)));
      setFichiers((f) => ({ type: "photos", pages: [...(f?.type === "photos" ? f.pages : []), ...reduites] }));
      apresChoix();
    } catch {
      setMessage({ ok: false, texte: "Cette photo n'a pas pu être lue (format non pris en charge)." });
    }
  }

  function enregistrer() {
    const donnees = new FormData();
    if (convention.conventionId) donnees.set("conventionId", convention.conventionId);
    if (convention.demandeCreneauId) donnees.set("demandeCreneauId", convention.demandeCreneauId);
    donnees.set("demandeMairieLe", demande);
    donnees.set("reponseMairieLe", reponse);
    donnees.set("commentaire", commentaire);
    if (fichiers?.type === "pdf") donnees.append("fichiers", fichiers.fichier);
    if (fichiers?.type === "photos") fichiers.pages.forEach((p, i) => donnees.append("fichiers", p, `page-${i + 1}.jpg`));
    demarrer(async () => {
      const r = await enregistrerConvention(donnees);
      setMessage({ ok: r.succes, texte: r.message ?? "" });
      if (r.succes) {
        setFichiers(null);
        setOuvert(false);
      }
    });
  }

  const resume = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
        <IconFileCertificate size={14} aria-hidden /> Convention mairie
      </span>
      <span className="text-slate-500">
        {convention.demandeMairieLe ? `demandée le ${dateCourte(convention.demandeMairieLe)}` : "pas encore demandée"}
      </span>
      {convention.reponseMairieLe && <span className="text-slate-500">réponse le {dateCourte(convention.reponseMairieLe)}</span>}
      {convention.fichierUrl ? (
        <a href={convention.fichierUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-status-dispo hover:underline">
          <IconCheck size={14} aria-hidden /> Voir la convention
        </a>
      ) : (
        <span className="font-medium text-status-occupee">scan manquant</span>
      )}
      {!ouvert && (
        <button type="button" onClick={() => setOuvert(true)} className="font-medium text-brand-accent hover:underline">
          {convention.fichierUrl ? "Modifier" : "Compléter"}
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50/50 p-2.5">
      {resume}
      {message && !ouvert && <p className={`text-xs ${message.ok ? "text-status-dispo" : "text-status-occupee"}`}>{message.texte}</p>}
      {ouvert && (
        <div className="flex flex-col gap-3 pt-1">
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              Demande à la mairie
              <input type="date" value={demande} onChange={(e) => setDemande(e.target.value)} className={champClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              Réponse de la mairie
              <input type="date" value={reponse} onChange={(e) => setReponse(e.target.value)} className={champClass} />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            Commentaire (facultatif, repris dans le registre)
            <input value={commentaire} onChange={(e) => setCommentaire(e.target.value)} maxLength={500} className={champClass} />
          </label>

          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-slate-500">
              {convention.fichierUrl ? "Remplacer le scan de la convention signée" : "Scan de la convention signée"}
            </p>
            {fichiers ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                {fichiers.type === "pdf" ? (
                  <>
                    <IconFileTypePdf size={18} aria-hidden />
                    <span className="truncate">{fichiers.fichier.name}</span>
                  </>
                ) : (
                  <>
                    <IconPhoto size={18} aria-hidden />
                    <span>
                      {fichiers.pages.length} photo{fichiers.pages.length > 1 ? "s" : ""} (une page chacune)
                    </span>
                    <button type="button" onClick={() => photoRef.current?.click()} className="text-xs text-brand-accent hover:underline">
                      + une page
                    </button>
                  </>
                )}
                <button type="button" onClick={() => setFichiers(null)} className="text-slate-400 hover:text-slate-600" aria-label="Retirer le fichier">
                  <IconX size={16} />
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => pdfRef.current?.click()} className={boutonSecondaire}>
                  <IconFileTypePdf size={16} aria-hidden /> PDF scanné
                </button>
                <button type="button" onClick={() => photoRef.current?.click()} className={boutonSecondaire}>
                  <IconCamera size={16} aria-hidden /> Photographier
                </button>
                <button type="button" onClick={() => galerieRef.current?.click()} className={boutonSecondaire}>
                  <IconPhoto size={16} aria-hidden /> Choisir des photos
                </button>
              </div>
            )}
            <input
              ref={pdfRef}
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFichiers({ type: "pdf", fichier: f });
                  apresChoix();
                }
                e.target.value = "";
              }}
            />
            <input ref={photoRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { ajouterPhotos(e.target.files); e.target.value = ""; }} />
            <input ref={galerieRef} type="file" accept="image/*" multiple hidden onChange={(e) => { ajouterPhotos(e.target.files); e.target.value = ""; }} />
          </div>

          {message && <p className={`text-sm ${message.ok ? "text-status-dispo" : "text-status-occupee"}`}>{message.texte}</p>}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={enregistrer}
              disabled={enCours}
              className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
            >
              {enCours ? (fichiers ? "Archivage…" : "Enregistrement…") : "Enregistrer"}
            </button>
            <button type="button" onClick={() => setOuvert(false)} className="text-sm text-slate-500 hover:underline">
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
