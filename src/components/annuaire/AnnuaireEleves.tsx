"use client";

import { useMemo, useState } from "react";
import { IconCopy, IconMail, IconMapPin, IconPhone, IconSearch } from "@tabler/icons-react";
import { filtrerEleves, valeursFiltre, type EleveExtrait } from "@/lib/annuaireEleves";

export type EleveVue = EleveExtrait & { id: string };

const champClass =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

export function AnnuaireEleves({ eleves }: { eleves: EleveVue[] }) {
  const [texte, setTexte] = useState("");
  const [instrument, setInstrument] = useState("");
  const [commune, setCommune] = useState("");
  const [copie, setCopie] = useState(false);

  const instruments = useMemo(() => valeursFiltre(eleves, "instruments"), [eleves]);
  const communes = useMemo(() => valeursFiltre(eleves, "commune"), [eleves]);
  const resultats = useMemo(() => filtrerEleves(eleves, { texte, instrument, commune }), [eleves, texte, instrument, commune]);
  const mails = [...new Set(resultats.flatMap((e) => e.emails))];
  const filtre = !!(texte || instrument || commune);

  async function copierMails() {
    const liste = mails.join(", ");
    try {
      await navigator.clipboard.writeText(liste);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      window.prompt("Copiez les adresses :", liste);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-lg bg-white p-3 shadow-sm">
        <label className="relative">
          <span className="sr-only">Rechercher</span>
          <IconSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder="Nom, prénom, mail, téléphone…"
            className={`${champClass} w-full pl-9`}
          />
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select value={instrument} onChange={(e) => setInstrument(e.target.value)} className={champClass} aria-label="Instrument">
            <option value="">Tous les instruments</option>
            {instruments.map((i) => (
              <option key={i.valeur} value={i.valeur}>
                {i.valeur} ({i.nombre})
              </option>
            ))}
          </select>
          <select value={commune} onChange={(e) => setCommune(e.target.value)} className={champClass} aria-label="Commune">
            <option value="">Toutes les communes</option>
            {communes.map((c) => (
              <option key={c.valeur} value={c.valeur}>
                {c.valeur} ({c.nombre})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600">
            <strong>{resultats.length}</strong> élève{resultats.length > 1 ? "s" : ""}
            {filtre && (
              <button
                type="button"
                onClick={() => {
                  setTexte("");
                  setInstrument("");
                  setCommune("");
                }}
                className="ml-2 text-xs text-slate-500 underline"
              >
                Tout afficher
              </button>
            )}
          </p>
          {mails.length > 0 && (
            <button
              type="button"
              onClick={copierMails}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <IconCopy size={14} aria-hidden />
              {copie ? "Adresses copiées !" : `Copier les ${mails.length} adresse${mails.length > 1 ? "s" : ""} mail`}
            </button>
          )}
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-lg bg-white shadow-sm">
        {resultats.map((e) => (
          <li key={e.id} className="flex flex-col gap-1 px-4 py-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="font-medium text-slate-800">
                {e.nom} {e.prenom}
              </p>
              {e.instruments.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInstrument(i)}
                  className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 hover:bg-emerald-100"
                >
                  {i}
                </button>
              ))}
              {e.commune && (
                <button
                  type="button"
                  onClick={() => setCommune(e.commune!)}
                  className="inline-flex items-center gap-0.5 text-xs text-slate-500 hover:underline"
                >
                  <IconMapPin size={12} aria-hidden />
                  {e.commune}
                </button>
              )}
            </div>
            {(e.telephones.length > 0 || e.emails.length > 0) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {e.telephones.map((t) => (
                  <a key={t} href={`tel:${t.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1 text-brand-accent hover:underline">
                    <IconPhone size={14} aria-hidden />
                    {t}
                  </a>
                ))}
                {e.emails.map((m) => (
                  <a key={m} href={`mailto:${m}`} className="inline-flex min-w-0 items-center gap-1 break-all text-brand-accent hover:underline">
                    <IconMail size={14} className="shrink-0" aria-hidden />
                    {m}
                  </a>
                ))}
              </div>
            )}
          </li>
        ))}
        {resultats.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Aucun élève ne correspond à cette recherche.</li>}
      </ul>
    </div>
  );
}
