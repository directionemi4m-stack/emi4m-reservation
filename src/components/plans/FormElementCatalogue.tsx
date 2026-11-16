"use client";

import { useActionState, useState } from "react";
import { enregistrerElementCatalogue, retirerElementCatalogue, type EtatAction } from "@/app/(app)/plans-de-scene/actions";
import { LIBELLE_CATEGORIE, type Categorie } from "@/lib/plansScene";

const champ = "rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus:border-brand-accent focus:outline-none";

export interface ValeursElement {
  id?: string;
  nom: string;
  categorie: Categorie;
  largeurCm: number;
  profondeurCm: number;
  forme: "RECT" | "ROND";
  couleur: string;
  abrege: string | null;
  chaise: boolean;
  pupitre: boolean;
  motsCles: string | null;
}

// Un élément du catalogue (instrument, mobilier, matériel), modifiable par la direction.
export function FormElementCatalogue({ valeurs }: { valeurs?: ValeursElement }) {
  const [ouvert, setOuvert] = useState(!valeurs);
  const [cle, setCle] = useState(0);
  const [etat, action, enCours] = useActionState(async (p: EtatAction, fd: FormData) => {
    const r = await enregistrerElementCatalogue(p, fd);
    if (r.succes && !valeurs) setCle((k) => k + 1);
    if (r.succes && valeurs) setOuvert(false);
    return r;
  }, { succes: true } as EtatAction);
  const v = valeurs;

  if (!ouvert && v) {
    return (
      <div className="flex flex-wrap items-center gap-2 py-1.5 text-sm">
        <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: v.couleur }} />
        <span className="min-w-36 flex-1 font-medium text-slate-800">{v.nom}</span>
        <span className="tabular-nums text-slate-600">
          {v.largeurCm} × {v.profondeurCm} cm
        </span>
        <span className="text-xs text-slate-400">{[v.chaise && "chaise", v.pupitre && "pupitre", v.forme === "ROND" && "rond"].filter(Boolean).join(", ")}</span>
        <button type="button" onClick={() => setOuvert(true)} className="text-xs text-brand-accent hover:underline">
          Modifier
        </button>
        {etat.message && <span className="text-xs text-status-dispo">{etat.message}</span>}
      </div>
    );
  }

  return (
    <form key={cle} action={action} className="grid gap-2 rounded-md bg-slate-50 p-2 sm:grid-cols-6">
      {v?.id && <input type="hidden" name="id" value={v.id} />}
      <input name="nom" required defaultValue={v?.nom} placeholder="Nom (ex. Violoncelle)" className={`${champ} sm:col-span-2`} />
      <select name="categorie" defaultValue={v?.categorie ?? "MUSICIEN"} className={champ}>
        {(Object.keys(LIBELLE_CATEGORIE) as Categorie[]).map((c) => (
          <option key={c} value={c}>
            {LIBELLE_CATEGORIE[c]}
          </option>
        ))}
      </select>
      <input name="largeur" required type="number" min={10} max={2000} defaultValue={v?.largeurCm} placeholder="Largeur cm" aria-label="Largeur en cm" className={champ} />
      <input name="profondeur" required type="number" min={10} max={2000} defaultValue={v?.profondeurCm} placeholder="Profondeur cm" aria-label="Profondeur en cm" className={champ} />
      <input name="couleur" type="color" defaultValue={v?.couleur ?? "#64748b"} aria-label="Couleur" className="h-8 w-full rounded-md border border-slate-300" />
      <input name="abrege" defaultValue={v?.abrege ?? ""} placeholder="Abrégé (Vlc)" className={champ} />
      <input name="motsCles" defaultValue={v?.motsCles ?? ""} placeholder="Instruments reconnus : violoncelle, cello" className={`${champ} sm:col-span-3`} />
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700 sm:col-span-2">
        <label className="flex items-center gap-1">
          <input type="checkbox" name="chaise" defaultChecked={v?.chaise} className="accent-brand-accent" /> chaise
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" name="pupitre" defaultChecked={v?.pupitre} className="accent-brand-accent" /> pupitre
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" name="forme" value="ROND" defaultChecked={v?.forme === "ROND"} className="accent-brand-accent" /> rond
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-6">
        <button type="submit" disabled={enCours} className="rounded-md bg-brand-accent px-3 py-1 text-sm font-semibold text-white disabled:opacity-60">
          {enCours ? "…" : v ? "Enregistrer" : "Ajouter au catalogue"}
        </button>
        {v && (
          <button type="button" onClick={() => setOuvert(false)} className="text-xs text-slate-500">
            Annuler
          </button>
        )}
        {v?.id && (
          <button type="submit" formAction={retirerElementCatalogue} className="text-xs text-slate-400 hover:text-status-occupee">
            Retirer du catalogue
          </button>
        )}
        {etat.message && <span className={`text-xs ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</span>}
      </div>
    </form>
  );
}
