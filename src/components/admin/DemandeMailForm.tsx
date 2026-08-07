"use client";

import { useState } from "react";
import { envoyerDemandeMail } from "@/app/(app)/admin/demandes/actions";

interface Contact {
  id: string;
  nom: string;
  email: string;
  communeId: string;
}

export function DemandeMailForm({
  salleNom,
  communeNom,
  communeId,
  dateFormatee,
  heureDebut,
  heureFin,
  contacts,
}: {
  salleNom: string;
  communeNom: string;
  communeId: string;
  dateFormatee: string;
  heureDebut: string;
  heureFin: string;
  contacts: Contact[];
}) {
  const [ouvert, setOuvert] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const [coches, setCoches] = useState<Set<string>>(
    () => new Set(contacts.filter((c) => c.communeId === communeId).map((c) => c.id))
  );
  const [libres, setLibres] = useState<{ nom: string; email: string }[]>([]);
  const [nomLibre, setNomLibre] = useState("");
  const [emailLibre, setEmailLibre] = useState("");

  const [sujet, setSujet] = useState(
    `Demande de réservation de salle — ${salleNom} (${communeNom}) — ${dateFormatee}`
  );
  const [corps, setCorps] = useState(
    `Bonjour,\n\nJe me permets de vous solliciter afin de réserver la salle ${salleNom} (${communeNom}) pour l'École de Musique Itinérante des 4 Montagnes (EMI4M), à la date et l'horaire suivants :\n\n${dateFormatee}, de ${heureDebut} à ${heureFin}\n\nMerci de bien vouloir me confirmer la disponibilité de cette salle.\n\nCordialement,\nLa direction — EMI4M`
  );

  function basculerContact(id: string) {
    setCoches((prec) => {
      const suivant = new Set(prec);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  }

  function ajouterLibre() {
    if (!emailLibre.includes("@")) return;
    setLibres((prec) => [...prec, { nom: nomLibre.trim() || emailLibre.trim(), email: emailLibre.trim() }]);
    setNomLibre("");
    setEmailLibre("");
  }

  const destinataires = [
    ...contacts.filter((c) => coches.has(c.id)).map((c) => ({ nom: c.nom, email: c.email })),
    ...libres,
  ];

  async function envoyer() {
    setEnCours(true);
    setErreur(null);
    const resultat = await envoyerDemandeMail({ destinataires, sujet, corps });
    setEnCours(false);
    if (resultat.statut === "erreur") setErreur(resultat.message ?? "Échec de l'envoi.");
    else setEnvoye(true);
  }

  if (envoye) {
    return <p className="text-xs font-medium text-status-dispo">✓ Demande envoyée.</p>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="text-xs font-medium text-brand-accent hover:underline"
      >
        ✉️ Demande à la mairie
      </button>

      {ouvert && (
        <div className="mt-2 flex w-80 flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-600">Destinataires</p>
          <div className="flex flex-col gap-1">
            {contacts.length === 0 && (
              <p className="text-xs text-slate-400">
                Aucun contact enregistré pour l&apos;instant.
              </p>
            )}
            {contacts.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={coches.has(c.id)} onChange={() => basculerContact(c.id)} />
                {c.nom} <span className="text-slate-400">({c.email})</span>
              </label>
            ))}
            {libres.map((l, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-slate-700">
                <span>
                  {l.nom} <span className="text-slate-400">({l.email})</span>
                </span>
                <button
                  type="button"
                  onClick={() => setLibres((prec) => prec.filter((_, idx) => idx !== i))}
                  className="text-status-occupee"
                  aria-label="Retirer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Nom"
              value={nomLibre}
              onChange={(e) => setNomLibre(e.target.value)}
              className="w-24 rounded border border-slate-300 px-1.5 py-1 text-xs"
            />
            <input
              type="email"
              placeholder="email@…"
              value={emailLibre}
              onChange={(e) => setEmailLibre(e.target.value)}
              className="flex-1 rounded border border-slate-300 px-1.5 py-1 text-xs"
            />
            <button
              type="button"
              onClick={ajouterLibre}
              className="rounded border border-slate-300 px-2 text-xs text-slate-600 hover:bg-white"
            >
              +
            </button>
          </div>

          <label className="text-xs font-medium text-slate-600">
            Objet
            <input
              type="text"
              value={sujet}
              onChange={(e) => setSujet(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Message
            <textarea
              value={corps}
              onChange={(e) => setCorps(e.target.value)}
              rows={7}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
            />
          </label>

          {erreur && <p className="text-xs text-status-occupee">{erreur}</p>}

          <button
            type="button"
            onClick={envoyer}
            disabled={enCours || destinataires.length === 0}
            className="self-start rounded-md bg-brand-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-60"
          >
            {enCours ? "Envoi…" : "Envoyer la demande"}
          </button>
        </div>
      )}
    </div>
  );
}
