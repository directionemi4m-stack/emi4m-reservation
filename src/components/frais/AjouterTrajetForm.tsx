"use client";

import { useActionState, useMemo, useState } from "react";
import { ajouterTrajet, type EtatAction } from "@/app/(app)/frais/actions";
import { LABELS_MISSION } from "@/lib/mission";
import type { TypeMission } from "@/generated/prisma/client";

interface TypeTrajet {
  id: string;
  nom: string;
  km: number;
  prix: number;
}

const ETAT_INITIAL: EtatAction = { succes: true };

const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

const OPTIONS_MISSION = Object.entries(LABELS_MISSION) as [TypeMission, string][];

export function AjouterTrajetForm({ typesTrajet }: { typesTrajet: TypeTrajet[] }) {
  const [etat, action, enCours] = useActionState(ajouterTrajet, ETAT_INITIAL);
  const [typeTrajetId, setTypeTrajetId] = useState("");
  const [typeMission, setTypeMission] = useState<TypeMission | "">("");
  const aujourdHui = new Date().toISOString().slice(0, 10);

  const typeChoisi = useMemo(
    () => typesTrajet.find((t) => t.id === typeTrajetId) ?? null,
    [typesTrajet, typeTrajetId]
  );

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-brand-slate">Déclarer un trajet</h2>
      <div className="flex flex-wrap gap-3">
        <input type="date" name="date" required defaultValue={aujourdHui} className={champClass} />
        <select
          name="typeMission"
          required
          value={typeMission}
          onChange={(e) => setTypeMission(e.target.value as TypeMission)}
          className={champClass}
        >
          <option value="" disabled>
            Mission…
          </option>
          {OPTIONS_MISSION.map(([valeur, libelle]) => (
            <option key={valeur} value={valeur}>
              {libelle}
            </option>
          ))}
        </select>
        <input
          type="text"
          name="precisionMission"
          placeholder={typeMission === "AUTRE" ? "Préciser (obligatoire)" : "Préciser (optionnel)"}
          required={typeMission === "AUTRE"}
          className={`flex-1 ${champClass}`}
        />
        <select
          name="typeTrajetId"
          required
          value={typeTrajetId}
          onChange={(e) => setTypeTrajetId(e.target.value)}
          className={champClass}
        >
          <option value="" disabled>
            Choisir un trajet…
          </option>
          {typesTrajet.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nom}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={enCours || !typeTrajetId || !typeMission}
          className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
        >
          {enCours ? "Ajout…" : "Ajouter"}
        </button>
      </div>
      {typeChoisi && (
        <p className="text-xs text-slate-500">
          {typeChoisi.km} km · {typeChoisi.prix.toFixed(2)} €
        </p>
      )}
      {etat.message && <p className="text-sm text-status-occupee">{etat.message}</p>}
    </form>
  );
}
