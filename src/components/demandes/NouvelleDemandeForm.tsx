"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  deposerDemande,
  type LigneDemandeInput,
  type LigneResultat,
} from "@/app/(app)/demandes/nouvelle/actions";
import { StatutBadge } from "@/components/demandes/StatutBadge";

interface Salle {
  id: string;
  nom: string;
  commune: { id: string; nom: string };
}

interface LigneFormulaire extends LigneDemandeInput {
  id: string;
}

function ligneVide(): LigneFormulaire {
  return { id: crypto.randomUUID(), date: "", heureDebut: "", heureFin: "" };
}

function grouperParCommune(salles: Salle[]) {
  const groupes = new Map<string, Salle[]>();
  for (const salle of salles) {
    const liste = groupes.get(salle.commune.nom) ?? [];
    liste.push(salle);
    groupes.set(salle.commune.nom, liste);
  }
  return Array.from(groupes.entries());
}

export function NouvelleDemandeForm({ salles }: { salles: Salle[] }) {
  const [salleId, setSalleId] = useState("");
  const [lignes, setLignes] = useState<LigneFormulaire[]>([ligneVide()]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultats, setResultats] = useState<LigneResultat[] | null>(null);
  const [enCours, demarrer] = useTransition();

  const groupes = grouperParCommune(salles);
  const aujourdHui = new Date().toISOString().slice(0, 10);

  function mettreAJourLigne(id: string, champ: keyof LigneDemandeInput, valeur: string) {
    setLignes((prec) => prec.map((l) => (l.id === id ? { ...l, [champ]: valeur } : l)));
  }

  function ajouterLigne() {
    setLignes((prec) => [...prec, ligneVide()]);
  }

  function supprimerLigne(id: string) {
    setLignes((prec) => (prec.length > 1 ? prec.filter((l) => l.id !== id) : prec));
  }

  function reinitialiser() {
    setSalleId("");
    setLignes([ligneVide()]);
    setResultats(null);
    setErreur(null);
  }

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setResultats(null);

    demarrer(async () => {
      const reponse = await deposerDemande(
        salleId,
        lignes.map(({ date, heureDebut, heureFin }) => ({ date, heureDebut, heureFin }))
      );

      if (!reponse.succes) {
        setErreur(reponse.message);
        return;
      }

      setResultats(reponse.lignes);
    });
  }

  if (resultats) {
    const enAttente = resultats.filter((l) => l.statut === "EN_ATTENTE").length;
    const refusees = resultats.filter((l) => l.statut === "REFUSEE").length;

    return (
      <div className="flex flex-col gap-4 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-slate">Résultat de votre demande</h2>
        <p className="text-sm text-slate-500">
          {enAttente > 0 && `${enAttente} date(s) en attente de validation par la direction. `}
          {refusees > 0 && `${refusees} date(s) rejetée(s) automatiquement (créneau déjà occupé).`}
        </p>
        <ul className="flex flex-col gap-2">
          {resultats.map((ligne, i) => (
            <li key={i} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">
                {new Date(`${ligne.date}T00:00:00`).toLocaleDateString("fr-FR", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}{" "}
                · {ligne.heureDebut}–{ligne.heureFin}
                {ligne.creneauBloquant && (
                  <span className="ml-2 text-xs text-slate-400">({ligne.creneauBloquant})</span>
                )}
              </span>
              <StatutBadge statut={ligne.statut} />
            </li>
          ))}
        </ul>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={reinitialiser}
            className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90"
          >
            Déposer une autre demande
          </button>
          <Link
            href="/demandes"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Voir mes demandes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-5 rounded-lg bg-white p-6 shadow-sm">
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Salle
        <select
          required
          value={salleId}
          onChange={(e) => setSalleId(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
        >
          <option value="" disabled>
            Choisir une salle…
          </option>
          {groupes.map(([commune, sallesCommune]) => (
            <optgroup key={commune} label={commune}>
              {sallesCommune.map((salle) => (
                <option key={salle.id} value={salle.id}>
                  {salle.nom}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium text-slate-700">Dates et horaires</span>
        {lignes.map((ligne) => (
          <div key={ligne.id} className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              required
              min={aujourdHui}
              value={ligne.date}
              onChange={(e) => mettreAJourLigne(ligne.id, "date", e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
            />
            <input
              type="time"
              required
              value={ligne.heureDebut}
              onChange={(e) => mettreAJourLigne(ligne.id, "heureDebut", e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
            />
            <span className="text-slate-400">à</span>
            <input
              type="time"
              required
              value={ligne.heureFin}
              onChange={(e) => mettreAJourLigne(ligne.id, "heureFin", e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
            />
            {lignes.length > 1 && (
              <button
                type="button"
                onClick={() => supprimerLigne(ligne.id)}
                className="text-sm text-status-occupee hover:underline"
              >
                Retirer
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={ajouterLigne}
          className="self-start text-sm font-medium text-brand-accent hover:underline"
        >
          + Ajouter une date
        </button>
      </div>

      {erreur && <p className="text-sm text-status-occupee">{erreur}</p>}

      <button
        type="submit"
        disabled={enCours}
        className="self-start rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
      >
        {enCours ? "Envoi en cours…" : "Envoyer la demande"}
      </button>
    </form>
  );
}
