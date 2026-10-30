"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconPaperclip } from "@tabler/icons-react";
import { useSoumission } from "@/lib/useSoumission";
import {
  ajouterDemande,
  basculerPaiement,
  enregistrerLocation,
  passerEnLocation,
  reconduireSaison,
  retirerDocument,
  supprimerDemande,
  supprimerLocation,
  type EtatAction,
} from "@/app/(app)/admin/locations/actions";
import { cleEleve, libelleAnneeLocation, libelleModePaiement, MODES_PAIEMENT } from "@/lib/locations";
import { AjoutDocument } from "@/components/locations/AjoutDocument";

const etatInitial: EtatAction = { succes: true };
const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";
const boutonPrincipal =
  "w-fit rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60";
const boutonSecondaire = "rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50";

export interface LocationVue {
  id: string;
  instrument: string;
  prenom: string;
  nom: string;
  anneeLocation: number;
  nbMois: number | null;
  paye: boolean;
  modePaiement: string | null;
  commentaire: string | null;
  dossierDriveUrl: string | null;
  documents: { id: string; nomFichier: string; url: string }[];
  historique: string[]; // « 2025-2026 · Flûte »
}

export interface DemandeVue {
  id: string;
  instrument: string;
  prenom: string;
  nom: string;
  commentaire: string | null;
}

function Message({ etat }: { etat: EtatAction }) {
  if (!etat.message) return null;
  return <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>;
}

function ListeInstruments({ instruments }: { instruments: string[] }) {
  return (
    <datalist id="instruments-connus">
      {instruments.map((i) => (
        <option key={i} value={i} />
      ))}
    </datalist>
  );
}

export function FormLocation({
  anneeDebut,
  location,
  onFini,
}: {
  anneeDebut: number;
  location?: LocationVue;
  onFini?: () => void;
}) {
  const [etat, soumettre, enCours] = useSoumission(enregistrerLocation, etatInitial);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!etat.succes || !etat.message) return;
    if (location) onFini?.();
    else formRef.current?.reset();
  }, [etat, location, onFini]);

  return (
    <form ref={formRef} onSubmit={soumettre} className="flex flex-col gap-3">
      {location && <input type="hidden" name="id" value={location.id} />}
      <input type="hidden" name="anneeDebut" value={anneeDebut} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input name="instrument" list="instruments-connus" required defaultValue={location?.instrument} placeholder="Instrument" className={champClass} />
        <input name="prenom" required defaultValue={location?.prenom} placeholder="Prénom" className={champClass} />
        <input name="nom" required defaultValue={location?.nom} placeholder="Nom" className={champClass} />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Année de location
          <select name="anneeLocation" defaultValue={location?.anneeLocation ?? 1} className={champClass}>
            {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {libelleAnneeLocation(n)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Durée
          <select name="nbMois" defaultValue={location?.nbMois ?? ""} className={champClass}>
            <option value="">—</option>
            <option value="9">9 mois</option>
            <option value="12">12 mois</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Paiement
          <select name="modePaiement" defaultValue={location?.modePaiement ?? ""} className={champClass}>
            <option value="">—</option>
            {MODES_PAIEMENT.map((m) => (
              <option key={m.valeur} value={m.valeur}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
          <input type="checkbox" name="paye" defaultChecked={location?.paye} className="h-4 w-4 accent-brand-accent" />
          Payé
        </label>
      </div>
      <textarea
        name="commentaire"
        rows={2}
        maxLength={500}
        defaultValue={location?.commentaire ?? ""}
        placeholder="Commentaire (caution, chèque à rendre…)"
        className={champClass}
      />
      <Message etat={etat} />
      <div className="flex gap-2">
        <button type="submit" disabled={enCours} className={boutonPrincipal}>
          {enCours ? "Enregistrement…" : location ? "Enregistrer" : "Ajouter la location"}
        </button>
        {location && (
          <button type="button" onClick={onFini} className={boutonSecondaire}>
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}

function BoutonSupprimer({ location }: { location: LocationVue }) {
  const [, soumettre, enCours] = useSoumission(supprimerLocation, etatInitial);
  return (
    <form
      onSubmit={(e) => {
        if (!window.confirm(`Supprimer la location de ${location.prenom} ${location.nom} ? Les documents archivés restent dans le Drive.`)) {
          e.preventDefault();
          return;
        }
        soumettre(e);
      }}
    >
      <input type="hidden" name="id" value={location.id} />
      <button type="submit" disabled={enCours} className="text-xs text-slate-400 hover:text-status-occupee">
        Supprimer
      </button>
    </form>
  );
}

function CarteLocation({ location, anneeDebut }: { location: LocationVue; anneeDebut: number }) {
  const [edition, setEdition] = useState(false);
  const [documents, setDocuments] = useState(false);

  if (edition) {
    return (
      <li className="rounded-lg bg-white p-4 shadow-sm">
        <FormLocation anneeDebut={anneeDebut} location={location} onFini={() => setEdition(false)} />
      </li>
    );
  }

  const details = [
    libelleAnneeLocation(location.anneeLocation),
    location.nbMois ? `${location.nbMois} mois` : null,
    libelleModePaiement(location.modePaiement) || null,
  ].filter(Boolean);

  return (
    <li className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">
            {location.nom.toUpperCase()} {location.prenom}
            <span className="font-normal text-slate-500"> · {location.instrument}</span>
          </p>
          <p className="text-xs text-slate-500">{details.join(" · ")}</p>
        </div>
        <form action={basculerPaiement}>
          <input type="hidden" name="id" value={location.id} />
          <button
            type="submit"
            title="Changer le statut de paiement"
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              location.paye ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-status-occupee"
            }`}
          >
            {location.paye ? "Payé" : "Non payé"}
          </button>
        </form>
      </div>

      {location.commentaire && <p className="whitespace-pre-line text-sm text-slate-600">{location.commentaire}</p>}
      {location.historique.length > 0 && (
        <p className="text-xs text-slate-400">Déjà loué : {location.historique.join(" ; ")}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setDocuments((v) => !v)} className="flex items-center gap-1 text-xs font-medium text-brand-accent">
          <IconPaperclip size={14} aria-hidden />
          {location.documents.length
            ? `${location.documents.length} document${location.documents.length > 1 ? "s" : ""}`
            : "Ajouter un document"}
        </button>
        <button type="button" onClick={() => setEdition(true)} className="text-xs font-medium text-slate-600 hover:text-brand-slate">
          Modifier
        </button>
        <BoutonSupprimer location={location} />
      </div>

      {documents && (
        <div className="flex flex-col gap-2">
          {location.documents.length > 0 && (
            <ul className="flex flex-col gap-1">
              {location.documents.map((d) => (
                <li key={d.id} className="flex items-center gap-2 text-sm">
                  <a href={d.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-brand-accent hover:underline">
                    {d.nomFichier}
                  </a>
                  <form
                    action={retirerDocument}
                    onSubmit={(e) => {
                      if (!window.confirm("Retirer ce document ? Il part dans la corbeille du Drive (récupérable 30 jours).")) e.preventDefault();
                    }}
                  >
                    <input type="hidden" name="id" value={d.id} />
                    <button type="submit" className="text-xs text-slate-400 hover:text-status-occupee">
                      Retirer
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          {location.dossierDriveUrl && (
            <a href={location.dossierDriveUrl} target="_blank" rel="noreferrer" className="text-xs text-slate-500 underline">
              Ouvrir le dossier dans le Drive
            </a>
          )}
          <AjoutDocument locationId={location.id} />
        </div>
      )}
    </li>
  );
}

type Filtre = "tous" | "non_payes" | "sans_document";

export function ListeLocations({
  anneeDebut,
  locations,
  instruments,
}: {
  anneeDebut: number;
  locations: LocationVue[];
  instruments: string[];
}) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [ajout, setAjout] = useState(false);

  const visibles = useMemo(() => {
    const q = cleEleve(recherche, "");
    return locations.filter(
      (l) =>
        (filtre === "tous" || (filtre === "non_payes" ? !l.paye : l.documents.length === 0)) &&
        (!q || cleEleve(`${l.prenom} ${l.nom}`, l.instrument).includes(q))
    );
  }, [locations, recherche, filtre]);

  const filtres: { cle: Filtre; label: string; n: number }[] = [
    { cle: "tous", label: "Toutes", n: locations.length },
    { cle: "non_payes", label: "Non payées", n: locations.filter((l) => !l.paye).length },
    { cle: "sans_document", label: "Sans document", n: locations.filter((l) => l.documents.length === 0).length },
  ];

  return (
    <section className="flex flex-col gap-3">
      <ListeInstruments instruments={instruments} />
      <div className="flex flex-wrap items-center gap-2">
        {filtres.map((f) => (
          <button
            key={f.cle}
            type="button"
            onClick={() => setFiltre(f.cle)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filtre === f.cle ? "bg-brand-slate text-white" : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"
            }`}
          >
            {f.label} ({f.n})
          </button>
        ))}
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un élève, un instrument…"
          className={`${champClass} min-w-0 flex-1 basis-48 py-1.5`}
        />
      </div>

      {ajout ? (
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-brand-slate">Nouvelle location</h2>
          <FormLocation anneeDebut={anneeDebut} />
          <button type="button" onClick={() => setAjout(false)} className="mt-2 text-xs text-slate-500 underline">
            Fermer
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setAjout(true)} className={boutonPrincipal}>
          + Ajouter une location
        </button>
      )}

      {visibles.length === 0 ? (
        <p className="rounded-lg bg-white p-4 text-sm text-slate-500 shadow-sm">Aucune location.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibles.map((l) => (
            <CarteLocation key={l.id} location={l} anneeDebut={anneeDebut} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function ListeAttente({ anneeDebut, demandes }: { anneeDebut: number; demandes: DemandeVue[] }) {
  const [etat, soumettre, enCours] = useSoumission(ajouterDemande, etatInitial);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (etat.succes && etat.message) formRef.current?.reset();
  }, [etat]);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-brand-slate">Demandes en attente ({demandes.length})</h2>
      {demandes.length > 0 && (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg bg-white shadow-sm">
          {demandes.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700">
                  {d.nom.toUpperCase()} {d.prenom} <span className="text-slate-500">· {d.instrument}</span>
                </p>
                {d.commentaire && <p className="text-xs text-slate-500">{d.commentaire}</p>}
              </div>
              <form action={passerEnLocation}>
                <input type="hidden" name="id" value={d.id} />
                <button type="submit" className={boutonSecondaire}>
                  Passer en location
                </button>
              </form>
              <form
                action={supprimerDemande}
                onSubmit={(e) => {
                  if (!window.confirm(`Supprimer la demande de ${d.prenom} ${d.nom} ?`)) e.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={d.id} />
                <button type="submit" className="text-xs text-slate-400 hover:text-status-occupee">
                  Supprimer
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form ref={formRef} onSubmit={soumettre} className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
        <input type="hidden" name="anneeDebut" value={anneeDebut} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input name="instrument" list="instruments-connus" required placeholder="Instrument souhaité" className={champClass} />
          <input name="prenom" required placeholder="Prénom" className={champClass} />
          <input name="nom" required placeholder="Nom" className={champClass} />
        </div>
        <input name="commentaire" maxLength={500} placeholder="Commentaire" className={champClass} />
        <Message etat={etat} />
        <button type="submit" disabled={enCours} className={boutonPrincipal}>
          {enCours ? "Ajout…" : "Ajouter la demande"}
        </button>
      </form>
    </section>
  );
}

export function BoutonReconduire({ anneeDebut, nombre }: { anneeDebut: number; nombre: number }) {
  const [etat, soumettre, enCours] = useSoumission(reconduireSaison, etatInitial);
  return (
    <form
      onSubmit={(e) => {
        if (!window.confirm(`Reprendre les ${nombre} location(s) de la saison précédente, en année suivante et non payées ?`)) {
          e.preventDefault();
          return;
        }
        soumettre(e);
      }}
      className="flex flex-col gap-2 rounded-lg border border-dashed border-brand-accent/50 bg-sky-50/40 p-4"
    >
      <input type="hidden" name="anneeDebut" value={anneeDebut} />
      <p className="text-sm text-slate-700">
        Préparer cette saison à partir de la précédente : ses {nombre} location(s) sont reprises en année suivante (1re → 2e…),
        non payées. Vous supprimerez ensuite celles qui s&apos;arrêtent.
      </p>
      <Message etat={etat} />
      <button type="submit" disabled={enCours} className={boutonPrincipal}>
        {enCours ? "Reconduction…" : "Reconduire les locations"}
      </button>
    </form>
  );
}
