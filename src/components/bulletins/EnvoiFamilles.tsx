"use client";

import { useState } from "react";
import { useSoumission } from "@/lib/useSoumission";
import { envoyerBulletinsPrets, envoyerUnBulletin, type EtatAction } from "@/app/(app)/bulletins-cham/actions";

const etatInitial: EtatAction = { succes: true };

export interface LigneEnvoi {
  eleveId: string;
  libelle: string;
  etat: "pret" | "envoye" | "incomplet" | "sans_mail";
  manque: string[];
  envoyeLe: string | null;
}

interface Periode {
  anneeDebut: number;
  trimestre: number;
}

const BADGES: Record<LigneEnvoi["etat"], { texte: string; classe: string }> = {
  pret: { texte: "Prêt", classe: "bg-sky-50 text-sky-700" },
  envoye: { texte: "Envoyé", classe: "bg-emerald-50 text-emerald-700" },
  incomplet: { texte: "Incomplet", classe: "bg-amber-50 text-amber-700" },
  sans_mail: { texte: "Pas de mail", classe: "bg-red-50 text-status-occupee" },
};

const date = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });

function ChampsPeriode({ periode }: { periode: Periode }) {
  return (
    <>
      <input type="hidden" name="anneeDebut" value={periode.anneeDebut} />
      <input type="hidden" name="trimestre" value={periode.trimestre} />
    </>
  );
}

// Envoi (ou renvoi) du bulletin d'un seul élève.
function BoutonUnEleve({ ligne, periode }: { ligne: LigneEnvoi; periode: Periode }) {
  const [etat, soumettre, enCours] = useSoumission(envoyerUnBulletin, etatInitial);
  const renvoi = ligne.etat === "envoye";
  return (
    <form
      onSubmit={(e) => {
        if (renvoi && !window.confirm(`Renvoyer le bulletin de ${ligne.libelle} à sa famille ?`)) {
          e.preventDefault();
          return;
        }
        soumettre(e);
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="eleveId" value={ligne.eleveId} />
      <ChampsPeriode periode={periode} />
      <button
        type="submit"
        disabled={enCours}
        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
      >
        {enCours ? "Envoi…" : renvoi ? "Renvoyer" : "Envoyer"}
      </button>
      {etat.message && <span className={`text-xs ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</span>}
    </form>
  );
}

// Envoi des bulletins aux familles : un mail par élève avec son bulletin en PDF. Rien ne
// part sans une confirmation explicite ; seuls les bulletins complets sont envoyés.
export function EnvoiFamilles({ lignes, periode, libellePeriode }: { lignes: LigneEnvoi[]; periode: Periode; libellePeriode: string }) {
  const [confirmation, setConfirmation] = useState(false);
  const [etat, soumettre, enCours] = useSoumission(envoyerBulletinsPrets, etatInitial);

  const compte = (e: LigneEnvoi["etat"]) => lignes.filter((l) => l.etat === e).length;
  const prets = lignes.filter((l) => l.etat === "pret");

  return (
    <section className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-brand-slate">Envoi aux familles — {libellePeriode}</h2>
        <p className="text-xs text-slate-500">
          Un mail par élève, à l&apos;adresse de sa fiche CHAM, avec son bulletin en PDF. Les familles qui répondent
          écrivent à la direction.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        {(["pret", "envoye", "incomplet", "sans_mail"] as const).map((e) => (
          <div key={e} className={`rounded-md px-2 py-2 ${BADGES[e].classe}`}>
            <p className="text-lg font-semibold">{compte(e)}</p>
            <p className="text-xs">{BADGES[e].texte}</p>
          </div>
        ))}
      </div>

      {prets.length > 0 && !confirmation && (
        <button
          type="button"
          onClick={() => setConfirmation(true)}
          className="w-fit rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90"
        >
          Envoyer les {prets.length} bulletin{prets.length > 1 ? "s" : ""} prêt{prets.length > 1 ? "s" : ""}…
        </button>
      )}

      {confirmation && (
        <form
          onSubmit={(e) => {
            soumettre(e);
            setConfirmation(false);
          }}
          className="flex flex-col gap-2 rounded-md border border-brand-accent/40 bg-sky-50/50 p-3"
        >
          <ChampsPeriode periode={periode} />
          <p className="text-sm font-medium text-brand-slate">
            {prets.length} mail{prets.length > 1 ? "s" : ""} vont partir maintenant, pour :
          </p>
          <p className="text-xs text-slate-600">{prets.map((p) => p.libelle).join(", ")}</p>
          <div className="flex gap-2">
            <button type="submit" className="rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90">
              Confirmer l&apos;envoi
            </button>
            <button
              type="button"
              onClick={() => setConfirmation(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {enCours && <p className="text-sm text-slate-500">Envoi en cours, cela peut prendre une minute…</p>}
      {etat.message && <p className={`text-sm ${etat.succes ? "text-status-dispo" : "text-status-occupee"}`}>{etat.message}</p>}

      <details className="text-sm">
        <summary className="cursor-pointer text-slate-600 hover:text-brand-slate">Détail par élève</summary>
        <ul className="mt-2 divide-y divide-slate-100">
          {lignes.map((l) => (
            <li key={l.eleveId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className="min-w-0 flex-1 text-slate-700">{l.libelle}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGES[l.etat].classe}`}>
                {l.etat === "envoye" && l.envoyeLe ? `Envoyé le ${date(l.envoyeLe)}` : BADGES[l.etat].texte}
              </span>
              {(l.etat === "pret" || l.etat === "envoye") && <BoutonUnEleve ligne={l} periode={periode} />}
              {l.etat === "incomplet" && <span className="w-full text-xs text-slate-500">Manque : {l.manque.join(", ")}</span>}
              {l.etat === "sans_mail" && (
                <span className="w-full text-xs text-slate-500">Ajoutez l&apos;adresse sur la fiche CHAM de l&apos;élève.</span>
              )}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
