"use client";

import { useMemo, useState } from "react";
import { AjouterEleveChamForm } from "@/components/cham/AjouterEleveChamForm";
import { LigneEleveCham, type EleveChamVue } from "@/components/cham/LigneEleveCham";
import {
  AUTORISATIONS,
  AUTORISATIONS_INTERCOURS,
  LIBELLE_AUTORISATION,
  LIBELLE_INTERCOURS,
  STYLE_AUTORISATION,
  STYLE_INTERCOURS,
  sansAccents,
} from "@/lib/cham";

type Filtre =
  | { champ: "intercours"; valeur: string }
  | { champ: "sortie16h30"; valeur: string }
  | { champ: "sansFiche" }
  | null;

function correspond(e: EleveChamVue, f: Filtre) {
  if (!f) return true;
  if (f.champ === "intercours") return e.autorisationIntercours === f.valeur;
  if (f.champ === "sortie16h30") return e.autorisationSortie16h30 === f.valeur;
  return !e.document;
}

function memeFiltre(a: Filtre, b: Filtre) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function ListeCham({ eleves, estAdmin }: { eleves: EleveChamVue[]; estAdmin: boolean }) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<Filtre>(null);

  const visibles = useMemo(() => {
    const cherche = sansAccents(recherche.trim());
    return eleves.filter((e) => {
      if (!correspond(e, filtre)) return false;
      if (!cherche) return true;
      return sansAccents(`${e.prenom} ${e.nom} ${e.nom} ${e.prenom} ${e.ville ?? ""}`).includes(cherche);
    });
  }, [eleves, recherche, filtre]);

  const pastille = (f: Exclude<Filtre, null>, libelle: string, style: string) => {
    const actif = memeFiltre(filtre, f);
    return (
      <button
        key={JSON.stringify(f)}
        type="button"
        onClick={() => setFiltre(actif ? null : f)}
        aria-pressed={actif}
        className={`rounded-full px-3 py-1 text-xs font-medium ring-2 transition ${style} ${
          actif ? "ring-brand-accent" : "ring-transparent"
        }`}
      >
        {libelle} ({eleves.filter((e) => correspond(e, f)).length})
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {estAdmin && <AjouterEleveChamForm />}

      <div className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un élève ou une ville…"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-xs font-medium text-slate-500">Intercours</span>
          {AUTORISATIONS_INTERCOURS.map((a) =>
            pastille({ champ: "intercours", valeur: a }, LIBELLE_INTERCOURS[a], STYLE_INTERCOURS[a])
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-xs font-medium text-slate-500">16h30</span>
          {AUTORISATIONS.map((a) =>
            pastille({ champ: "sortie16h30", valeur: a }, LIBELLE_AUTORISATION[a], STYLE_AUTORISATION[a])
          )}
        </div>
        {estAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-20 text-xs font-medium text-slate-500">Fiche</span>
            {pastille({ champ: "sansFiche" }, "Sans fiche scannée", "bg-slate-200 text-slate-600")}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500">
        {visibles.length === eleves.length
          ? `${eleves.length} élève${eleves.length > 1 ? "s" : ""}`
          : `${visibles.length} sur ${eleves.length} élèves`}
      </p>

      <div className="flex flex-col gap-2">
        {visibles.map((e) => (
          // La clé change quand la fiche est modifiée : l'éditeur se referme sur les nouvelles valeurs.
          <LigneEleveCham
            key={[e.id, e.prenom, e.nom, e.age, e.telephone, e.email, e.ville].join("|")}
            eleve={e}
            estAdmin={estAdmin}
          />
        ))}
        {visibles.length === 0 && <p className="text-sm text-slate-500">Aucun élève ne correspond.</p>}
      </div>
    </div>
  );
}
