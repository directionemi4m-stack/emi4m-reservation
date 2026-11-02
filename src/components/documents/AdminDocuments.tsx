"use client";

import { useRef, useState } from "react";
import { IconBrandGoogleDrive, IconFileUpload } from "@tabler/icons-react";
import { useSoumission } from "@/lib/useSoumission";
import {
  basculerRetrait,
  mettreAJourDrive,
  publierDocument,
  publierNouvelleVersion,
  type EtatAction,
} from "@/app/(app)/admin/documents/actions";
import { ATTESTATION_DEFAUT, titreDepuisNomFichier } from "@/lib/documentsSignes";

const etatInitial: EtatAction = { succes: true };
const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";
const boutonPrincipal =
  "w-fit rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60";
const boutonSecondaire = "rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50";

function Message({ etat }: { etat: EtatAction }) {
  if (!etat.message) return null;
  return <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>;
}

// Zone où l'on glisse le PDF (ou qu'on touche pour le choisir). Le fichier reste dans le
// champ « fichier » du formulaire.
function DepotPdf({ onFichier }: { onFichier: (nom: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [nom, setNom] = useState<string | null>(null);
  const [survol, setSurvol] = useState(false);

  function choisir(fichiers: FileList | null) {
    const f = fichiers?.[0];
    if (!f) return;
    setNom(f.name);
    onFichier(f.name);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setSurvol(true);
      }}
      onDragLeave={() => setSurvol(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSurvol(false);
        if (!inputRef.current || !e.dataTransfer.files.length) return;
        inputRef.current.files = e.dataTransfer.files;
        choisir(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center transition ${
        survol ? "border-brand-accent bg-sky-50" : "border-slate-300 bg-white hover:bg-slate-50"
      }`}
    >
      <IconFileUpload size={28} className="text-slate-400" aria-hidden />
      <p className="text-sm font-medium text-slate-700">{nom ?? "Glissez le PDF ici"}</p>
      <p className="text-xs text-slate-400">{nom ? "Touchez pour changer de fichier" : "ou touchez pour le choisir (10 Mo max.)"}</p>
      <input ref={inputRef} type="file" name="fichier" accept="application/pdf" hidden onChange={(e) => choisir(e.target.files)} />
    </div>
  );
}

function ChampsDocument({ titre, setTitre, attestation }: { titre: string; setTitre: (t: string) => void; attestation?: string }) {
  return (
    <>
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        Titre affiché aux profs
        <input name="titre" value={titre} onChange={(e) => setTitre(e.target.value)} required className={champClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        Phrase que chaque prof coche et signe
        <textarea name="attestation" defaultValue={attestation ?? ATTESTATION_DEFAUT} rows={3} className={champClass} />
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="prevenir" defaultChecked className="h-4 w-4 accent-brand-accent" />
        Prévenir tous les profs par mail et notification
      </label>
    </>
  );
}

export function FormPublication() {
  const [etat, soumettre, enCours] = useSoumission(publierDocument, etatInitial);
  const [titre, setTitre] = useState("");
  const [cle, setCle] = useState(0);

  if (etat.succes && etat.message) {
    return (
      <div className="flex flex-col gap-2">
        <Message etat={etat} />
        <button type="button" onClick={() => location.reload()} className={boutonSecondaire}>
          Publier un autre document
        </button>
      </div>
    );
  }
  return (
    <form key={cle} onSubmit={soumettre} className="flex flex-col gap-3">
      <DepotPdf onFichier={(nom) => setTitre((t) => t || titreDepuisNomFichier(nom))} />
      <ChampsDocument titre={titre} setTitre={setTitre} />
      <Message etat={etat} />
      <div className="flex gap-2">
        <button type="submit" disabled={enCours} className={boutonPrincipal}>
          {enCours ? "Publication…" : "Publier pour signature"}
        </button>
        {titre && (
          <button
            type="button"
            onClick={() => {
              setTitre("");
              setCle((c) => c + 1);
            }}
            className={boutonSecondaire}
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}

export interface SignataireVue {
  nom: string;
  signeLe: string | null;
  url: string | null; // copie signée dans le Drive
}

export interface DocumentAdminVue {
  id: string;
  titre: string;
  attestation: string;
  version: number;
  publieLe: string;
  relanceLe: string | null;
  retire: boolean;
  registreUrl: string | null;
  signataires: SignataireVue[];
  copiesManquantes: number;
}

function FormNouvelleVersion({ document, onFini }: { document: DocumentAdminVue; onFini: () => void }) {
  const [etat, soumettre, enCours] = useSoumission(publierNouvelleVersion, etatInitial);
  const [titre, setTitre] = useState(document.titre);
  if (etat.succes && etat.message) {
    return (
      <div className="flex flex-col gap-2">
        <Message etat={etat} />
        <button type="button" onClick={onFini} className={boutonSecondaire}>
          Fermer
        </button>
      </div>
    );
  }
  return (
    <form onSubmit={soumettre} className="flex flex-col gap-3 rounded-md bg-slate-50 p-3">
      <input type="hidden" name="id" value={document.id} />
      <p className="text-xs text-slate-500">Tous les profs devront signer la nouvelle version (les signatures actuelles restent dans l&apos;historique).</p>
      <DepotPdf onFichier={() => undefined} />
      <ChampsDocument titre={titre} setTitre={setTitre} attestation={document.attestation} />
      <Message etat={etat} />
      <div className="flex gap-2">
        <button type="submit" disabled={enCours} className={boutonPrincipal}>
          {enCours ? "Publication…" : `Publier la version ${document.version + 1}`}
        </button>
        <button type="button" onClick={onFini} className={boutonSecondaire}>
          Annuler
        </button>
      </div>
    </form>
  );
}

function BoutonDrive({ id }: { id: string }) {
  const [etat, soumettre, enCours] = useSoumission(mettreAJourDrive, etatInitial);
  return (
    <form onSubmit={soumettre} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={enCours} className={boutonSecondaire}>
        {enCours ? "Mise à jour…" : "Mettre à jour le Drive"}
      </button>
      <Message etat={etat} />
    </form>
  );
}

export function CarteDocument({ document }: { document: DocumentAdminVue }) {
  const [nouvelle, setNouvelle] = useState(false);
  const signes = document.signataires.filter((s) => s.signeLe);
  const manquants = document.signataires.filter((s) => !s.signeLe);
  const pourcent = document.signataires.length ? Math.round((100 * signes.length) / document.signataires.length) : 0;

  return (
    <li className={`flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm ${document.retire ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-slate">
            {document.titre} {document.retire && <span className="text-xs font-normal text-slate-500">(retiré)</span>}
          </p>
          <p className="text-xs text-slate-500">
            Version {document.version} du {document.publieLe}
            {document.relanceLe ? ` · relance envoyée le ${document.relanceLe}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/documents/${document.id}?v=${document.version}`} target="_blank" rel="noreferrer" className={boutonSecondaire}>
            Ouvrir le PDF
          </a>
          {document.registreUrl && (
            <a href={document.registreUrl} target="_blank" rel="noreferrer" className={`${boutonSecondaire} flex items-center gap-1`}>
              <IconBrandGoogleDrive size={14} aria-hidden /> Registre
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-status-dispo transition-all" style={{ width: `${pourcent}%` }} />
        </div>
        <p className="text-xs text-slate-600">
          {signes.length} / {document.signataires.length} signatures
        </p>
      </div>

      {manquants.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500">Pas encore signé</p>
          <p className="text-sm text-slate-700">{manquants.map((s) => s.nom).join(", ")}</p>
        </div>
      )}
      {signes.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs font-medium text-slate-500">Signé ({signes.length})</summary>
          <ul className="mt-1 flex flex-col gap-0.5">
            {signes.map((s) => (
              <li key={s.nom} className="flex flex-wrap items-center gap-x-2 text-sm text-slate-700">
                {s.nom} <span className="text-xs text-slate-400">le {s.signeLe}</span>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-brand-accent underline">
                    copie signée
                  </a>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {nouvelle ? (
        <FormNouvelleVersion document={document} onFini={() => setNouvelle(false)} />
      ) : (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <button type="button" onClick={() => setNouvelle(true)} className={boutonSecondaire}>
            Nouvelle version
          </button>
          <form
            action={basculerRetrait}
            onSubmit={(e) => {
              if (!document.retire && !window.confirm("Retirer ce document ? Les profs n'auront plus à le signer (les signatures sont conservées).")) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={document.id} />
            <button type="submit" className={boutonSecondaire}>
              {document.retire ? "Remettre en signature" : "Retirer"}
            </button>
          </form>
          {(document.copiesManquantes > 0 || !document.registreUrl) && <BoutonDrive id={document.id} />}
        </div>
      )}
    </li>
  );
}
