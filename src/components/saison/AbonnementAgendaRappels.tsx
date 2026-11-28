"use client";

import { useState } from "react";

// Direction : l'adresse de l'agenda « Rappels EMI4M » à coller une fois dans Google Agenda.
export function AbonnementAgendaRappels({ url }: { url: string }) {
  const [copie, setCopie] = useState(false);
  return (
    <details className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm">
      <summary className="cursor-pointer font-semibold text-brand-slate">Rappels dans votre agenda Google (matos J-2, clés la veille)</summary>
      <div className="mt-3 flex flex-col gap-3 text-slate-600">
        <p>
          Abonnez-vous une fois à cet agenda : chaque événement de la saison y ajoute « Préparer le matos » 2 jours avant et
          « Aller chercher les clés » la veille, à 9h00. Les ajouts et changements de date suivent tout seuls (Google relit
          l&apos;agenda toutes les quelques heures). Les notifications de l&apos;appli continuent en parallèle.
        </p>
        <div className="flex flex-wrap gap-2">
          <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700" />
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              setCopie(true);
            }}
            className="rounded-md bg-brand-accent px-3 py-2 text-xs font-semibold text-white hover:bg-brand-accent/90"
          >
            {copie ? "Copiée ✓" : "Copier l'adresse"}
          </button>
        </div>
        <ol className="list-decimal pl-5 text-xs">
          <li>Sur un ordinateur, ouvrez Google Agenda (calendar.google.com).</li>
          <li>À gauche, « Autres agendas » → « + » → « À partir de l&apos;URL ».</li>
          <li>Collez l&apos;adresse, puis « Ajouter un agenda ». Il apparaît sous le nom « Rappels EMI4M », aussi sur le téléphone.</li>
        </ol>
        <p className="text-xs text-slate-500">Gardez cette adresse pour vous : elle donne accès aux dates et lieux des événements.</p>
      </div>
    </details>
  );
}
