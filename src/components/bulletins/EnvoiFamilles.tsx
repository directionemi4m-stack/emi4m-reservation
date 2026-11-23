"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { actualiserPdfBulletin, envoyerBulletinConfirme, signerTousLesBulletins } from "@/app/(app)/bulletins-cham/actions";
import { PadSignature } from "@/components/bulletins/PadSignature";
import { adresseValide, contenuMailBulletin } from "@/lib/bulletinsCham";

export interface LigneEnvoi {
  eleveId: string;
  libelle: string;
  prenom: string;
  nom: string;
  email: string | null;
  etat: "pret" | "envoye" | "incomplet" | "sans_mail";
  manque: string[];
  manqueProfs: string[];
  signe: boolean;
  aDesParties: boolean;
  envoyeLe: string | null;
  envoyeA: string | null;
  documentUrl: string | null;
}

interface Periode {
  anneeDebut: number;
  trimestre: number;
}

const BADGES: Record<LigneEnvoi["etat"], { texte: string; classe: string }> = {
  pret: { texte: "Prêt", classe: "bg-sky-50 text-sky-700" },
  envoye: { texte: "Envoyé", classe: "bg-emerald-50 text-emerald-700" },
  incomplet: { texte: "À compléter", classe: "bg-amber-50 text-amber-700" },
  sans_mail: { texte: "Pas de mail", classe: "bg-red-50 text-status-occupee" },
};
const boutonPrincipal = "w-fit rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90 disabled:opacity-50";
const boutonSecondaire = "rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50";
const date = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

// Signature de la direction sur tous les bulletins qui ne l'ont pas encore.
function SignatureGroupee({ lignes, periode, maSignature, directionNom }: { lignes: LigneEnvoi[]; periode: Periode; maSignature: string | null; directionNom: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [incomplets, setIncomplets] = useState(false);
  const [progression, setProgression] = useState<{ fait: number; total: number } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  const aSigner = lignes.filter((l) => !l.signe && l.aDesParties);
  const complets = aSigner.filter((l) => l.manqueProfs.length === 0);
  const nonComplets = aSigner.filter((l) => l.manqueProfs.length > 0);
  const nombre = complets.length + (incomplets ? nonComplets.length : 0);

  async function confirmer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setProgression({ fait: 0, total: nombre });
    const r = await signerTousLesBulletins(new FormData(e.currentTarget));
    if (!r.succes || !r.eleveIds) {
      setProgression(null);
      setMessage({ ok: false, texte: r.message ?? "Signature impossible." });
      return;
    }
    let pdfRates = 0;
    for (const [i, eleveId] of r.eleveIds.entries()) {
      const ok = await actualiserPdfBulletin(eleveId, periode.anneeDebut, periode.trimestre).catch(() => false);
      if (!ok) pdfRates++;
      setProgression({ fait: i + 1, total: r.eleveIds.length });
    }
    setProgression(null);
    setOuvert(false);
    setMessage({
      ok: pdfRates === 0,
      texte: `${pluriel(r.eleveIds.length, "bulletin")} signé${r.eleveIds.length > 1 ? "s" : ""}.${pdfRates ? ` ${pdfRates} PDF du Drive à remettre à jour (le mail joindra quand même la bonne version).` : ""}`,
    });
    router.refresh();
  }

  if (aSigner.length === 0) return message ? <p className={`text-sm ${message.ok ? "text-status-dispo" : "text-status-occupee"}`}>{message.texte}</p> : null;
  return (
    <div className="flex flex-col gap-2">
      {!ouvert && (
        <button type="button" onClick={() => setOuvert(true)} className={boutonPrincipal}>
          ✍️ Appliquer ma signature sur tous les bulletins ({aSigner.length})…
        </button>
      )}
      {ouvert && (
        <form onSubmit={confirmer} className="flex flex-col gap-3 rounded-md border border-brand-accent/40 bg-sky-50/50 p-3">
          <input type="hidden" name="anneeDebut" value={periode.anneeDebut} />
          <input type="hidden" name="trimestre" value={periode.trimestre} />
          <div>
            <p className="text-sm font-semibold text-brand-slate">Signer {pluriel(nombre, "bulletin")} au nom de : {directionNom}</p>
            <p className="text-xs text-slate-600">Rien n&apos;est envoyé aux familles à cette étape. Une signature déjà posée n&apos;est pas remplacée.</p>
          </div>
          <PadSignature nom="signature" initiale={maSignature} />
          {nonComplets.length > 0 && (
            <div className="rounded-md bg-amber-50 p-2 text-sm text-amber-900">
              <label className="flex items-start gap-2">
                <input type="checkbox" name="incomplets" checked={incomplets} onChange={(e) => setIncomplets(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-accent" />
                <span>Signer aussi {nonComplets.length > 1 ? `les ${nonComplets.length} bulletins` : "le bulletin"} où il manque encore un prof</span>
              </label>
              <p className="ml-6 mt-1 text-xs">{nonComplets.map((l) => l.libelle).join(", ")}</p>
            </div>
          )}
          {progression && (
            <p className="text-sm text-slate-600">
              Mise à jour des PDF : {progression.fait} / {progression.total}…
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={!!progression || nombre === 0} className={boutonPrincipal}>
              Confirmer la signature de {pluriel(nombre, "bulletin")}
            </button>
            <button type="button" disabled={!!progression} onClick={() => setOuvert(false)} className={boutonSecondaire}>
              Annuler
            </button>
          </div>
        </form>
      )}
      {message && <p className={`text-sm ${message.ok ? "text-status-dispo" : "text-status-occupee"}`}>{message.texte}</p>}
    </div>
  );
}

// Écran de confirmation obligatoire avant tout envoi : le mail tel qu'il partira, et
// l'adresse de chaque famille, modifiable.
function ConfirmationEnvoi({ lignes, periode, renvoi, surFermer }: { lignes: LigneEnvoi[]; periode: Periode; renvoi: boolean; surFermer: () => void }) {
  const router = useRouter();
  const adresseDe = (l: LigneEnvoi) => (renvoi ? (l.envoyeA ?? l.email ?? "") : (l.email ?? ""));
  const [adresses, setAdresses] = useState<Record<string, string>>(() => Object.fromEntries(lignes.map((l) => [l.eleveId, adresseDe(l)])));
  const [coches, setCoches] = useState<Set<string>>(() => new Set(lignes.filter((l) => adresseValide(adresseDe(l))).map((l) => l.eleveId)));
  const [apercuId, setApercuId] = useState(lignes[0]?.eleveId);
  const [garder, setGarder] = useState(true);
  const [progression, setProgression] = useState<{ fait: number; total: number } | null>(null);
  const [bilan, setBilan] = useState<{ envoyes: number; echecs: string[]; arrete: boolean } | null>(null);
  const arret = useRef(false);

  const choisies = lignes.filter((l) => coches.has(l.eleveId));
  const invalides = choisies.filter((l) => !adresseValide(adresses[l.eleveId] ?? ""));
  const modifiees = choisies.filter((l) => (adresses[l.eleveId] ?? "").trim() !== (l.email ?? "")).length;
  const apercu = lignes.find((l) => l.eleveId === apercuId) ?? lignes[0];
  const contenu = contenuMailBulletin(apercu, periode.anneeDebut, periode.trimestre);

  const changerAdresse = (id: string, valeur: string) => {
    setAdresses((a) => ({ ...a, [id]: valeur }));
    setApercuId(id);
    if (adresseValide(valeur)) setCoches((c) => new Set(c).add(id));
  };
  const basculer = (id: string, oui: boolean) =>
    setCoches((c) => {
      const n = new Set(c);
      if (oui) n.add(id);
      else n.delete(id);
      return n;
    });

  async function envoyer() {
    arret.current = false;
    const liste = choisies;
    const echecs: string[] = [];
    let envoyes = 0;
    setProgression({ fait: 0, total: liste.length });
    for (const [i, l] of liste.entries()) {
      if (arret.current) break;
      const r = await envoyerBulletinConfirme({
        eleveId: l.eleveId,
        anneeDebut: periode.anneeDebut,
        trimestre: periode.trimestre,
        adresse: adresses[l.eleveId].trim(),
        garderAdresse: garder,
        renvoi,
      }).catch(() => ({ succes: false, message: "Erreur de connexion." }));
      if (r.succes) envoyes++;
      else echecs.push(`${l.libelle} : ${r.message}`);
      setProgression({ fait: i + 1, total: liste.length });
    }
    setProgression(null);
    setBilan({ envoyes, echecs, arrete: arret.current });
    router.refresh();
  }

  if (bilan) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
        <p className={`text-sm font-medium ${bilan.echecs.length ? "text-status-occupee" : "text-status-dispo"}`}>
          {pluriel(bilan.envoyes, "bulletin")} envoyé{bilan.envoyes > 1 ? "s" : ""}
          {bilan.arrete ? " avant l'arrêt" : ""}.
        </p>
        {bilan.echecs.length > 0 && (
          <ul className="list-disc pl-5 text-xs text-status-occupee">
            {bilan.echecs.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        <button type="button" onClick={surFermer} className={`${boutonSecondaire} w-fit`}>
          Fermer
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-brand-accent/40 bg-sky-50/50 p-3">
      <p className="text-sm font-semibold text-brand-slate">Vérifiez avant l&apos;envoi : rien n&apos;est parti pour l&apos;instant</p>

      <div className="rounded-md border border-slate-200 bg-white p-3 text-sm">
        <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Mail prévu{lignes.length > 1 ? ` (aperçu : ${apercu.libelle})` : ""}</p>
        <p className="break-all text-slate-700">
          <span className="text-slate-500">À : </span>
          {(adresses[apercu.eleveId] ?? "").trim() || "adresse à indiquer"}
        </p>
        <p className="text-slate-700">
          <span className="text-slate-500">Objet : </span>
          {contenu.sujet}
        </p>
        <p className="mb-2 break-words text-slate-700">
          <span className="text-slate-500">Pièce jointe : </span>
          {contenu.nomFichier}
          {apercu.documentUrl && (
            <>
              {" · "}
              <a href={apercu.documentUrl} target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">
                voir le bulletin
              </a>
            </>
          )}
        </p>
        <div className="flex flex-col gap-2 border-t border-slate-100 pt-2 text-slate-700">
          {contenu.paragraphes.map((p) => (
            <p key={p} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase text-slate-500">
          Destinataires : {choisies.length} sur {lignes.length}
        </p>
        <ul className="flex max-h-96 flex-col divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200 bg-white">
          {lignes.map((l) => {
            const a = adresses[l.eleveId] ?? "";
            const coche = coches.has(l.eleveId);
            const erreur = coche && !adresseValide(a);
            return (
              <li key={l.eleveId} className="flex flex-col gap-1 p-2 sm:flex-row sm:items-center sm:gap-2">
                <label className="flex min-w-0 items-center gap-2 text-sm text-slate-700 sm:w-52 sm:shrink-0">
                  <input
                    type="checkbox"
                    checked={coche}
                    disabled={!!progression}
                    onChange={(e) => basculer(l.eleveId, e.target.checked)}
                    aria-label={`Envoyer le bulletin de ${l.libelle}`}
                    className="h-4 w-4 shrink-0 accent-brand-accent"
                  />
                  <span className="truncate">{l.libelle}</span>
                </label>
                <input
                  type="email"
                  value={a}
                  disabled={!!progression}
                  onFocus={() => setApercuId(l.eleveId)}
                  onChange={(e) => changerAdresse(l.eleveId, e.target.value)}
                  placeholder="Adresse mail à indiquer"
                  aria-label={`Adresse mail pour ${l.libelle}`}
                  aria-invalid={erreur}
                  className={`min-w-0 flex-1 rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/30 ${erreur ? "border-status-occupee" : "border-slate-300"}`}
                />
              </li>
            );
          })}
        </ul>
      </div>

      {modifiees > 0 && (
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={garder} disabled={!!progression} onChange={(e) => setGarder(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-accent" />
          Garder {modifiees > 1 ? `les ${modifiees} adresses modifiées` : "l'adresse modifiée"} sur la fiche CHAM pour les prochains envois
        </label>
      )}
      {invalides.length > 0 && <p className="text-sm text-status-occupee">Adresse à corriger : {invalides.map((l) => l.libelle).join(", ")}.</p>}
      {progression && (
        <p className="text-sm text-slate-600">
          Envoi en cours : {progression.fait} / {progression.total}…
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {progression ? (
          <button type="button" onClick={() => (arret.current = true)} className={boutonSecondaire}>
            Arrêter l&apos;envoi
          </button>
        ) : (
          <>
            <button type="button" onClick={envoyer} disabled={choisies.length === 0 || invalides.length > 0} className={boutonPrincipal}>
              Confirmer l&apos;envoi de {pluriel(choisies.length, "mail")}
            </button>
            <button type="button" onClick={surFermer} className={boutonSecondaire}>
              Annuler
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Signature groupée, puis envoi aux familles : un mail par élève avec son bulletin en PDF.
// Rien ne part sans passer par l'écran de confirmation.
export function EnvoiFamilles({
  lignes,
  periode,
  libellePeriode,
  maSignature,
  directionNom,
  bloque,
}: {
  lignes: LigneEnvoi[];
  periode: Periode;
  libellePeriode: string;
  maSignature: string | null;
  directionNom: string;
  bloque: boolean;
}) {
  const [envoi, setEnvoi] = useState<{ ids: string[]; renvoi: boolean } | null>(null);
  const compte = (e: LigneEnvoi["etat"]) => lignes.filter((l) => l.etat === e).length;
  const aEnvoyer = lignes.filter((l) => l.etat === "pret" || l.etat === "sans_mail");
  const lignesEnvoi = envoi ? lignes.filter((l) => envoi.ids.includes(l.eleveId)) : [];

  return (
    <section id="envoi-familles" className="flex scroll-mt-4 flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-brand-slate">Signature et envoi aux familles — {libellePeriode}</h2>
        <p className="text-xs text-slate-500">
          Un mail par élève avec son bulletin en PDF. Chaque envoi passe par un écran de confirmation où vous relisez le mail et pouvez changer
          l&apos;adresse. Les familles qui répondent écrivent à la direction.
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

      {bloque ? (
        <p className="rounded-md bg-status-attente/20 p-2 text-sm text-brand-slate">Signature et envoi impossibles en mode « connecté en tant que ».</p>
      ) : (
        <>
          <SignatureGroupee lignes={lignes} periode={periode} maSignature={maSignature} directionNom={directionNom} />
          {aEnvoyer.length > 0 && !envoi && (
            <button type="button" onClick={() => setEnvoi({ ids: aEnvoyer.map((l) => l.eleveId), renvoi: false })} className={boutonPrincipal}>
              ✉️ Préparer l&apos;envoi de {pluriel(aEnvoyer.length, "bulletin")}…
            </button>
          )}
          {envoi && lignesEnvoi.length > 0 && <ConfirmationEnvoi key={envoi.ids.join("|")} lignes={lignesEnvoi} periode={periode} renvoi={envoi.renvoi} surFermer={() => setEnvoi(null)} />}
        </>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer text-slate-600 hover:text-brand-slate">Détail par élève</summary>
        <ul className="mt-2 divide-y divide-slate-100">
          {lignes.map((l) => (
            <li key={l.eleveId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className="min-w-0 flex-1 text-slate-700">{l.libelle}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGES[l.etat].classe}`}>
                {l.etat === "envoye" && l.envoyeLe ? `Envoyé le ${date(l.envoyeLe)}` : BADGES[l.etat].texte}
              </span>
              {!bloque && (l.etat === "pret" || l.etat === "sans_mail" || l.etat === "envoye") && (
                <button
                  type="button"
                  onClick={() => {
                    setEnvoi({ ids: [l.eleveId], renvoi: l.etat === "envoye" });
                    document.getElementById("envoi-familles")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  {l.etat === "envoye" ? "Renvoyer…" : "Envoyer…"}
                </button>
              )}
              {l.etat === "envoye" && l.envoyeA && <span className="w-full break-all text-xs text-slate-500">À {l.envoyeA}</span>}
              {l.etat === "incomplet" && <span className="w-full text-xs text-slate-500">Manque : {l.manque.join(", ")}</span>}
              {l.etat === "sans_mail" && <span className="w-full text-xs text-slate-500">Adresse à indiquer dans l&apos;écran de confirmation.</span>}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
