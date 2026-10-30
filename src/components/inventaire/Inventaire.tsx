"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { IconCamera, IconPhoto, IconPhotoOff } from "@tabler/icons-react";
import { useSoumission } from "@/lib/useSoumission";
import {
  ajouterPhotos,
  enregistrerArticle,
  marquerVerifie,
  retirerPhoto,
  supprimerArticle,
  type EtatAction,
} from "@/app/(app)/admin/inventaire/actions";
import { CATEGORIES_INVENTAIRE, ETATS_MATERIEL, formaterEuros, libelleCategorie, libelleEtat } from "@/lib/inventaire";
import { reduirePhoto } from "@/lib/imageNavigateur";

const etatInitial: EtatAction = { succes: true };
const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";
const boutonPrincipal =
  "w-fit rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60";
const boutonSecondaire =
  "flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60";

export interface ArticleVue {
  id: string;
  numeroImmo: number | null;
  designation: string;
  categorie: string;
  marqueModele: string | null;
  numeroSerie: string | null;
  dateAcquisition: string | null; // AAAA-MM-JJ
  valeurCentimes: number | null;
  lieuId: string | null;
  lieuNom: string | null;
  localisation: string | null;
  etat: string;
  remarques: string | null;
  verifieLe: string | null; // ISO
  dossierDriveUrl: string | null;
  photos: { id: string; url: string }[];
}

const dateFr = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
const miniature = (id: string) => `/api/inventaire/miniature/${id}`;

const COULEURS_ETAT: Record<string, string> = {
  BON: "bg-emerald-50 text-emerald-700",
  A_REVISER: "bg-amber-50 text-amber-700",
  HORS_SERVICE: "bg-red-50 text-status-occupee",
  SORTI: "bg-slate-100 text-slate-500",
};

function Message({ etat }: { etat: EtatAction }) {
  if (!etat.message) return null;
  return <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>;
}

export function FormArticle({
  article,
  lieux,
  onFini,
}: {
  article?: ArticleVue;
  lieux: { id: string; nom: string }[];
  onFini?: () => void;
}) {
  const [etat, soumettre, enCours] = useSoumission(enregistrerArticle, etatInitial);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!etat.succes || !etat.message) return;
    if (article) onFini?.();
    else formRef.current?.reset();
  }, [etat, article, onFini]);

  const libelle = (texte: string, enfant: React.ReactNode) => (
    <label className="flex flex-col gap-1 text-xs text-slate-500">
      {texte}
      {enfant}
    </label>
  );

  return (
    <form ref={formRef} onSubmit={soumettre} className="flex flex-col gap-3">
      {article && <input type="hidden" name="id" value={article.id} />}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_7rem]">
        {libelle("Désignation", <input name="designation" required defaultValue={article?.designation} className={champClass} />)}
        {libelle(
          "N° immo.",
          <input name="numeroImmo" inputMode="numeric" defaultValue={article?.numeroImmo ?? ""} placeholder="—" className={champClass} />
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {libelle(
          "Marque / modèle / référence",
          <input name="marqueModele" defaultValue={article?.marqueModele ?? ""} className={champClass} />
        )}
        {libelle(
          "N° de série",
          <input name="numeroSerie" defaultValue={article?.numeroSerie ?? ""} placeholder="S'il y en a un" className={champClass} />
        )}
        {libelle(
          "Catégorie",
          <select name="categorie" defaultValue={article?.categorie ?? "MUSIQUE"} className={champClass}>
            {CATEGORIES_INVENTAIRE.map((c) => (
              <option key={c.valeur} value={c.valeur}>
                {c.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {libelle(
          "Commune",
          <select name="lieuId" defaultValue={article?.lieuId ?? ""} className={champClass}>
            <option value="">—</option>
            {lieux.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nom}
              </option>
            ))}
          </select>
        )}
        {libelle(
          "Où exactement",
          <input name="localisation" defaultValue={article?.localisation ?? ""} placeholder="Salle, placard, chez un prof…" className={champClass} />
        )}
        {libelle(
          "État",
          <select name="etat" defaultValue={article?.etat ?? "BON"} className={champClass}>
            {ETATS_MATERIEL.map((e) => (
              <option key={e.valeur} value={e.valeur}>
                {e.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {libelle(
          "Date d'acquisition",
          <input name="dateAcquisition" type="date" defaultValue={article?.dateAcquisition ?? ""} className={champClass} />
        )}
        {libelle(
          "Valeur d'achat (€)",
          <input
            name="valeur"
            inputMode="decimal"
            defaultValue={article?.valeurCentimes != null ? (article.valeurCentimes / 100).toFixed(2).replace(".", ",") : ""}
            placeholder="1 250,00"
            className={champClass}
          />
        )}
      </div>
      <textarea name="remarques" rows={2} maxLength={1000} defaultValue={article?.remarques ?? ""} placeholder="Remarques" className={champClass} />
      <Message etat={etat} />
      <div className="flex gap-2">
        <button type="submit" disabled={enCours} className={boutonPrincipal}>
          {enCours ? "Enregistrement…" : article ? "Enregistrer" : "Ajouter le bien"}
        </button>
        {article && (
          <button type="button" onClick={onFini} className={boutonSecondaire}>
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}

// Photos du bien : appareil photo ou galerie. Chaque photo part en deux tailles : 2000 px
// pour le Drive, 400 px pour l'affichage dans l'appli.
function AjoutPhotos({ articleId }: { articleId: string }) {
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  const photoRef = useRef<HTMLInputElement>(null);
  const galerieRef = useRef<HTMLInputElement>(null);

  function envoyer(liste: FileList | null) {
    if (!liste?.length) return;
    setMessage(null);
    const fichiers = [...liste];
    demarrer(async () => {
      try {
        const donnees = new FormData();
        donnees.set("articleId", articleId);
        for (const [i, f] of fichiers.entries()) {
          donnees.append("photos", await reduirePhoto(f, 2000), `photo-${i}.jpg`);
          donnees.append("miniatures", await reduirePhoto(f, 400, 0.75), `mini-${i}.jpg`);
        }
        const r = await ajouterPhotos(donnees);
        setMessage({ ok: r.succes, texte: r.message ?? "" });
      } catch {
        setMessage({ ok: false, texte: "Cette photo n'a pas pu être lue (format non pris en charge)." });
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={enCours} onClick={() => photoRef.current?.click()} className={boutonSecondaire}>
          <IconCamera size={16} aria-hidden /> Prendre une photo
        </button>
        <button type="button" disabled={enCours} onClick={() => galerieRef.current?.click()} className={boutonSecondaire}>
          <IconPhoto size={16} aria-hidden /> Choisir des photos
        </button>
      </div>
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          envoyer(e.target.files);
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
          envoyer(e.target.files);
          e.target.value = "";
        }}
      />
      {enCours && <p className="text-xs text-slate-500">Envoi en cours…</p>}
      {message && <p className={`text-xs ${message.ok ? "text-status-dispo" : "text-status-occupee"}`}>{message.texte}</p>}
    </div>
  );
}

function CarteArticle({ article, lieux }: { article: ArticleVue; lieux: { id: string; nom: string }[] }) {
  const [edition, setEdition] = useState(false);
  const [photos, setPhotos] = useState(false);

  if (edition) {
    return (
      <li className="rounded-lg bg-white p-4 shadow-sm">
        <FormArticle article={article} lieux={lieux} onFini={() => setEdition(false)} />
      </li>
    );
  }

  const lieu = [article.lieuNom, article.localisation].filter(Boolean).join(" · ");
  const details = [
    article.marqueModele,
    article.numeroSerie ? `N° série ${article.numeroSerie}` : null,
    article.dateAcquisition ? `acheté le ${dateFr(article.dateAcquisition)}` : null,
    article.valeurCentimes != null ? formaterEuros(article.valeurCentimes) : null,
  ].filter(Boolean);

  return (
    <li className={`flex flex-col gap-2 rounded-lg bg-white p-3 shadow-sm ${article.etat === "SORTI" ? "opacity-60" : ""}`}>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setPhotos((v) => !v)}
          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100"
          aria-label={article.photos.length ? "Voir les photos" : "Ajouter une photo"}
        >
          {article.photos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element -- miniature servie par l'appli, déjà réduite
            <img src={miniature(article.photos[0].id)} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <IconPhotoOff size={22} className="text-slate-400" aria-hidden />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">
            {article.numeroImmo !== null && <span className="font-normal text-slate-400">N°{article.numeroImmo} · </span>}
            {article.designation}
          </p>
          {details.length > 0 && <p className="text-xs text-slate-500">{details.join(" · ")}</p>}
          <p className="text-xs text-slate-500">{lieu || "Lieu non renseigné"}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COULEURS_ETAT[article.etat] ?? ""}`}>
              {libelleEtat(article.etat)}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {article.verifieLe ? `Vu le ${dateFr(article.verifieLe)}` : "Jamais vérifié"}
            </span>
          </div>
        </div>
      </div>

      {article.remarques && <p className="whitespace-pre-line text-sm text-slate-600">{article.remarques}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <form action={marquerVerifie}>
          <input type="hidden" name="id" value={article.id} />
          <button type="submit" className={boutonSecondaire}>
            Vu aujourd&apos;hui
          </button>
        </form>
        <button type="button" onClick={() => setPhotos((v) => !v)} className="text-xs font-medium text-brand-accent">
          {article.photos.length ? `${article.photos.length} photo${article.photos.length > 1 ? "s" : ""}` : "Ajouter une photo"}
        </button>
        <button type="button" onClick={() => setEdition(true)} className="text-xs font-medium text-slate-600 hover:text-brand-slate">
          Modifier
        </button>
        <form
          action={supprimerArticle}
          onSubmit={(e) => {
            if (
              !window.confirm(
                `Supprimer « ${article.designation} » de l'inventaire ? Pour un bien vendu ou jeté, préférez l'état « Sorti de l'inventaire », qui garde son historique.`
              )
            )
              e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={article.id} />
          <button type="submit" className="text-xs text-slate-400 hover:text-status-occupee">
            Supprimer
          </button>
        </form>
      </div>

      {photos && (
        <div className="flex flex-col gap-2 rounded-md bg-slate-50 p-3">
          {article.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {article.photos.map((p) => (
                <div key={p.id} className="flex flex-col gap-1">
                  <a href={p.url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-md bg-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element -- miniature servie par l'appli, déjà réduite */}
                    <img src={miniature(p.id)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </a>
                  <form
                    action={retirerPhoto}
                    onSubmit={(e) => {
                      if (!window.confirm("Retirer cette photo ? Elle part dans la corbeille du Drive (récupérable 30 jours).")) e.preventDefault();
                    }}
                  >
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" className="text-[11px] text-slate-400 hover:text-status-occupee">
                      Retirer
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
          {article.dossierDriveUrl && (
            <a href={article.dossierDriveUrl} target="_blank" rel="noreferrer" className="text-xs text-slate-500 underline">
              Ouvrir le dossier dans le Drive
            </a>
          )}
          <AjoutPhotos articleId={article.id} />
        </div>
      )}
    </li>
  );
}

type Filtre = "tous" | "sans_photo" | "sans_serie" | "non_verifie" | "a_reviser";

export function ListeInventaire({
  articles,
  lieux,
  debutAnneeScolaire,
}: {
  articles: ArticleVue[];
  lieux: { id: string; nom: string }[];
  debutAnneeScolaire: string; // ISO : « vérifié cette année » = depuis le 1er septembre
}) {
  const [recherche, setRecherche] = useState("");
  const [categorie, setCategorie] = useState("");
  const [lieu, setLieu] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [sortis, setSortis] = useState(false);
  const [ajout, setAjout] = useState(false);

  const actifs = articles.filter((a) => sortis || a.etat !== "SORTI");
  const tests: Record<Filtre, (a: ArticleVue) => boolean> = {
    tous: () => true,
    sans_photo: (a) => a.photos.length === 0,
    sans_serie: (a) => !a.numeroSerie,
    non_verifie: (a) => !a.verifieLe || a.verifieLe < debutAnneeScolaire,
    a_reviser: (a) => a.etat === "A_REVISER" || a.etat === "HORS_SERVICE",
  };

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return actifs.filter(
      (a) =>
        tests[filtre](a) &&
        (!categorie || a.categorie === categorie) &&
        (!lieu || a.lieuId === lieu) &&
        (!q ||
          [a.designation, a.marqueModele, a.numeroSerie, a.localisation, a.numeroImmo?.toString()]
            .filter(Boolean)
            .some((t) => t!.toLowerCase().includes(q)))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tests ne dépend que de debutAnneeScolaire
  }, [actifs, recherche, categorie, lieu, filtre, debutAnneeScolaire]);

  const valeur = visibles.reduce((s, a) => s + (a.valeurCentimes ?? 0), 0);
  const filtres: { cle: Filtre; label: string }[] = [
    { cle: "tous", label: "Tous" },
    { cle: "non_verifie", label: "Pas vus cette année" },
    { cle: "sans_photo", label: "Sans photo" },
    { cle: "sans_serie", label: "Sans n° de série" },
    { cle: "a_reviser", label: "À réviser / HS" },
  ];

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1">
        {filtres.map((f) => (
          <button
            key={f.cle}
            type="button"
            onClick={() => setFiltre(f.cle)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filtre === f.cle ? "bg-brand-slate text-white" : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"
            }`}
          >
            {f.label} ({actifs.filter(tests[f.cle]).length})
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher (désignation, marque, n° de série, n° immo.)"
          className={`${champClass} py-1.5`}
        />
        <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className={`${champClass} py-1.5`}>
          <option value="">Toutes catégories</option>
          {CATEGORIES_INVENTAIRE.map((c) => (
            <option key={c.valeur} value={c.valeur}>
              {c.label}
            </option>
          ))}
        </select>
        <select value={lieu} onChange={(e) => setLieu(e.target.value)} className={`${champClass} py-1.5`}>
          <option value="">Tous lieux</option>
          {lieux.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nom}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          {visibles.length} bien{visibles.length > 1 ? "s" : ""} · valeur d&apos;achat {formaterEuros(valeur)}
          {categorie && ` · ${libelleCategorie(categorie)}`}
        </span>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={sortis} onChange={(e) => setSortis(e.target.checked)} className="accent-brand-accent" />
          Afficher les biens sortis
        </label>
      </div>

      {ajout ? (
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-brand-slate">Nouveau bien</h2>
          <FormArticle lieux={lieux} />
          <button type="button" onClick={() => setAjout(false)} className="mt-2 text-xs text-slate-500 underline">
            Fermer
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setAjout(true)} className={boutonPrincipal}>
          + Ajouter un bien
        </button>
      )}

      {visibles.length === 0 ? (
        <p className="rounded-lg bg-white p-4 text-sm text-slate-500 shadow-sm">Aucun bien.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibles.map((a) => (
            <CarteArticle key={a.id} article={a} lieux={lieux} />
          ))}
        </ul>
      )}
    </section>
  );
}
