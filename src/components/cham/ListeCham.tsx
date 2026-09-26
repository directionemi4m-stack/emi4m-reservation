"use client";

import { useMemo, useState } from "react";
import { AjouterEleveChamForm } from "@/components/cham/AjouterEleveChamForm";
import { LigneEleveCham, type EleveChamVue } from "@/components/cham/LigneEleveCham";
import { AUTORISATIONS, LIBELLE_AUTORISATION, STYLE_AUTORISATION, sansAccents } from "@/lib/cham";
import type { AutorisationSortie } from "@/generated/prisma/client";

export function ListeCham({ eleves, estAdmin }: { eleves: EleveChamVue[]; estAdmin: boolean }) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<AutorisationSortie | null>(null);

  const decompte = useMemo(() => {
    const d: Record<AutorisationSortie, number> = { A_RENSEIGNER: 0, SEUL: 0, ACCOMPAGNE: 0 };
    for (const e of eleves) d[e.autorisationSortie]++;
    return d;
  }, [eleves]);

  const visibles = useMemo(() => {
    const cherche = sansAccents(recherche.trim());
    return eleves.filter((e) => {
      if (filtre && e.autorisationSortie !== filtre) return false;
      if (!cherche) return true;
      return sansAccents(`${e.prenom} ${e.nom} ${e.nom} ${e.prenom} ${e.ville ?? ""}`).includes(cherche);
    });
  }, [eleves, recherche, filtre]);

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
        <div className="flex flex-wrap gap-2">
          {AUTORISATIONS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setFiltre((f) => (f === a ? null : a))}
              aria-pressed={filtre === a}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-2 transition ${STYLE_AUTORISATION[a]} ${
                filtre === a ? "ring-brand-accent" : "ring-transparent"
              }`}
            >
              {LIBELLE_AUTORISATION[a]} ({decompte[a]})
            </button>
          ))}
        </div>
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
