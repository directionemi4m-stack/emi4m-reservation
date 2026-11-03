"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { IconFileSpreadsheet } from "@tabler/icons-react";
import { importerEleves, lireFichierEleves, type EtatAction } from "@/app/(app)/admin/annuaire-eleves/actions";
import {
  CHAMPS,
  correspondanceProposee,
  estCleChamp,
  extraireEleves,
  trouverLigneEnTetes,
  type Correspondance,
} from "@/lib/annuaireEleves";

const champClass =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

const lettreColonne = (i: number): string => (i >= 26 ? lettreColonne(Math.floor(i / 26) - 1) : "") + String.fromCharCode(65 + (i % 26));

interface Lecture {
  feuilles: string[];
  feuille: number;
  lignes: string[][];
}

export function ImportEleves({
  communes,
  correspondancePrecedente,
  nbActuel,
}: {
  communes: string[];
  correspondancePrecedente: Record<string, string>;
  nbActuel: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [survol, setSurvol] = useState(false);
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [ligneEnTetes, setLigneEnTetes] = useState(0);
  const [correspondance, setCorrespondance] = useState<Correspondance>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [etat, setEtat] = useState<EtatAction | null>(null);
  const [enLecture, demarrerLecture] = useTransition();
  const [enImport, demarrerImport] = useTransition();

  function proposer(lignes: string[][], ligne: number) {
    setLigneEnTetes(ligne);
    setCorrespondance(correspondanceProposee(lignes[ligne] ?? [], correspondancePrecedente));
  }

  function lire(f: File, feuille: number) {
    setErreur(null);
    setEtat(null);
    const donnees = new FormData();
    donnees.set("fichier", f);
    donnees.set("feuille", String(feuille));
    demarrerLecture(async () => {
      const r = await lireFichierEleves(donnees);
      if (!r.succes) {
        setLecture(null);
        setErreur(r.message);
        return;
      }
      setLecture(r);
      proposer(r.lignes, trouverLigneEnTetes(r.lignes));
    });
  }

  function choisir(fichiers: FileList | null) {
    const f = fichiers?.[0];
    if (!f) return;
    setFichier(f);
    lire(f, 0);
  }

  const lignes = useMemo(() => lecture?.lignes ?? [], [lecture]);
  const enTetes = lignes[ligneEnTetes] ?? [];
  const nbColonnes = Math.max(0, ...lignes.slice(ligneEnTetes, ligneEnTetes + 200).map((l) => l.length));
  const colonnes = Array.from({ length: nbColonnes }, (_, i) => i).filter((i) =>
    lignes.slice(ligneEnTetes).some((l) => l[i]?.trim())
  );
  const exemples = (i: number) =>
    lignes
      .slice(ligneEnTetes + 1)
      .map((l) => l[i]?.trim())
      .filter(Boolean)
      .slice(0, 2) as string[];

  const apercu = useMemo(
    () => (lecture ? extraireEleves(lignes, ligneEnTetes, correspondance, communes) : null),
    [lecture, lignes, ligneEnTetes, correspondance, communes]
  );
  const aUnNom = correspondance.some((c) => c === "nom" || c === "nomComplet");
  const manquants = apercu
    ? {
        instrument: apercu.eleves.filter((e) => e.instruments.length === 0).length,
        mail: apercu.eleves.filter((e) => e.emails.length === 0).length,
        telephone: apercu.eleves.filter((e) => e.telephones.length === 0).length,
        commune: apercu.eleves.filter((e) => !e.commune).length,
      }
    : null;

  function importer() {
    if (!fichier || !lecture || !apercu) return;
    const question =
      nbActuel > 0
        ? `Remplacer l'annuaire actuel (${nbActuel} élèves) par les ${apercu.eleves.length} élèves de ce fichier ?`
        : `Importer les ${apercu.eleves.length} élèves de ce fichier ?`;
    if (!window.confirm(question)) return;
    const donnees = new FormData();
    donnees.set("fichier", fichier);
    donnees.set("feuille", String(lecture.feuille));
    donnees.set("ligneEnTetes", String(ligneEnTetes));
    donnees.set("correspondance", JSON.stringify(correspondance));
    demarrerImport(async () => setEtat(await importerEleves({ succes: true }, donnees)));
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSurvol(false);
          choisir(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center transition ${
          survol ? "border-brand-accent bg-sky-50" : "border-slate-300 bg-white hover:bg-slate-50"
        }`}
      >
        <IconFileSpreadsheet size={28} className="text-slate-400" aria-hidden />
        <p className="text-sm font-medium text-slate-700">{fichier?.name ?? "Glissez le fichier Excel des inscriptions ici"}</p>
        <p className="text-xs text-slate-400">
          {enLecture ? "Lecture du fichier…" : fichier ? "Touchez pour changer de fichier" : "ou touchez pour le choisir (.xlsx ou .csv, 10 Mo max.)"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          hidden
          onChange={(e) => choisir(e.target.files)}
        />
      </div>

      {erreur && <p className="text-sm text-status-occupee">{erreur}</p>}

      {lecture && (
        <section className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-brand-slate">1. Les colonnes du fichier</h2>
          <div className="flex flex-wrap gap-3">
            {lecture.feuilles.length > 1 && (
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                Feuille
                <select
                  value={lecture.feuille}
                  onChange={(e) => fichier && lire(fichier, Number(e.target.value))}
                  className={champClass}
                >
                  {lecture.feuilles.map((f, i) => (
                    <option key={i} value={i}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              Ligne des titres de colonnes
              <input
                type="number"
                min={1}
                max={Math.max(1, lignes.length)}
                value={ligneEnTetes + 1}
                onChange={(e) => {
                  const n = Math.min(Math.max(1, Number(e.target.value) || 1), Math.max(1, lignes.length)) - 1;
                  proposer(lignes, n);
                }}
                className={`${champClass} w-24`}
              />
            </label>
          </div>
          <p className="text-xs text-slate-500">
            Pour chaque colonne, choisissez l&apos;information qu&apos;elle contient. Les autres sont ignorées. Plusieurs
            colonnes peuvent avoir la même information (mail de la mère, du père…). Ce choix sera reproposé l&apos;an
            prochain.
          </p>
          <ul className="flex flex-col divide-y divide-slate-100">
            {colonnes.map((i) => {
              const valeur = correspondance[i] ?? null;
              return (
                <li key={i} className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-2 ${valeur ? "" : "opacity-60"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">
                      <span className="mr-1 text-xs text-slate-400">{lettreColonne(i)}</span>
                      {enTetes[i]?.trim() || "(sans titre)"}
                    </p>
                    <p className="truncate text-xs text-slate-400">{exemples(i).join(" · ") || "—"}</p>
                  </div>
                  <select
                    value={valeur ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCorrespondance((c) => {
                        const suivante = [...c];
                        suivante[i] = estCleChamp(v) ? v : null;
                        return suivante;
                      });
                    }}
                    className={`${champClass} w-56`}
                  >
                    <option value="">Ignorer</option>
                    {CHAMPS.map((c) => (
                      <option key={c.cle} value={c.cle}>
                        {c.libelle}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {apercu && manquants && (
        <section className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-brand-slate">2. Aperçu</h2>
          {!aUnNom ? (
            <p className="text-sm text-status-occupee">Indiquez au moins la colonne du nom des élèves.</p>
          ) : (
            <>
              <p className="text-sm text-slate-700">
                <strong>{apercu.eleves.length} élèves</strong> trouvés
                {apercu.doublonsFusionnes > 0 &&
                  ` · ${apercu.doublonsFusionnes} ligne${apercu.doublonsFusionnes > 1 ? "s" : ""} regroupée${apercu.doublonsFusionnes > 1 ? "s" : ""} (même élève, plusieurs instruments)`}
                {apercu.lignesIgnorees > 0 && ` · ${apercu.lignesIgnorees} ligne${apercu.lignesIgnorees > 1 ? "s" : ""} sans nom ignorée${apercu.lignesIgnorees > 1 ? "s" : ""}`}
              </p>
              <p className="text-xs text-slate-500">
                Sans instrument : {manquants.instrument} · sans mail : {manquants.mail} · sans téléphone : {manquants.telephone} · sans
                commune : {manquants.commune}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr>
                      <th className="py-1 pr-3 font-medium">Élève</th>
                      <th className="py-1 pr-3 font-medium">Instrument</th>
                      <th className="py-1 pr-3 font-medium">Commune</th>
                      <th className="py-1 pr-3 font-medium">Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apercu.eleves.slice(0, 8).map((e, i) => (
                      <tr key={i} className="border-t border-slate-100 align-top">
                        <td className="py-1.5 pr-3 text-slate-700">
                          {e.nom} {e.prenom}
                        </td>
                        <td className="py-1.5 pr-3 text-slate-500">{e.instruments.join(", ") || "—"}</td>
                        <td className="py-1.5 pr-3 text-slate-500">{e.commune ?? "—"}</td>
                        <td className="py-1.5 pr-3 text-xs text-slate-500">{[...e.emails, ...e.telephones].join(" · ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {apercu.eleves.length > 8 && <p className="text-xs text-slate-400">… et {apercu.eleves.length - 8} autres.</p>}
            </>
          )}
          {etat?.message && <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>}
          <button
            type="button"
            onClick={importer}
            disabled={!aUnNom || apercu.eleves.length === 0 || enImport || enLecture}
            className="w-fit rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
          >
            {enImport ? "Import en cours…" : nbActuel > 0 ? "Remplacer l'annuaire par ce fichier" : "Importer ces élèves"}
          </button>
        </section>
      )}
    </div>
  );
}
