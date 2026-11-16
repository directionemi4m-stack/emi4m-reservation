"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type PointerEvent as ReactPointerEvent } from "react";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconCopy,
  IconMagnet,
  IconPrinter,
  IconRotate,
  IconRotateClockwise,
  IconSelectAll,
  IconTrash,
  IconZoomIn,
  IconZoomOut,
} from "@tabler/icons-react";
import { DessinPlan } from "@/components/plans/DessinPlan";
import { sauverPlan, sauverScene } from "@/app/(app)/plans-de-scene/actions";
import {
  aimanter,
  alignerEnLigne,
  depuisModele,
  disposerEnArc,
  elementPourInstrument,
  inventaire,
  LIBELLE_CATEGORIE,
  metres,
  musiciens,
  nouvelId,
  problemes,
  seChevauchent,
  type Categorie,
  type ElementPlan,
  type ModeleElement,
} from "@/lib/plansScene";

type ModeleCatalogue = ModeleElement & { id: string };
export interface SceneChoix {
  id: string;
  nom: string;
  largeurCm: number;
  profondeurCm: number;
  elements: ElementPlan[];
}
export interface Membre {
  nom: string;
  instrument: string | null;
}
interface Meta {
  titre: string;
  notes: string;
  largeurCm: number;
  profondeurCm: number;
  sceneId: string | null;
  classeId: string | null;
  lieuId: string | null;
}

const PAS_AIMANT = 10;
const champ = "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";
const bouton = "inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40";
const CATEGORIES: Categorie[] = ["MUSICIEN", "MOBILIER", "MATERIEL", "DECOR"];
const mots = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

// Éditeur d'un plan de scène (ou des éléments fixes d'une scène) : on ajoute les éléments du
// catalogue, on les déplace au doigt ou à la souris, on les tourne, on les dispose en arc ;
// chevauchements et dépassements sont signalés ; tout est enregistré automatiquement.
export function EditeurPlan({
  mode,
  id,
  initial,
  elementsInitiaux,
  catalogue,
  scenes = [],
  classes = [],
  lieux = [],
  membres = {},
  retour,
  impression,
}: {
  mode: "plan" | "scene";
  id: string;
  initial: Meta;
  elementsInitiaux: ElementPlan[];
  catalogue: ModeleCatalogue[];
  scenes?: SceneChoix[];
  classes?: { id: string; nom: string }[];
  lieux?: { id: string; nom: string }[];
  membres?: Record<string, Membre[]>; // musiciens à placer, par ensemble ("" : ceux du passage)
  retour: { href: string; libelle: string };
  impression?: string;
}) {
  const [elements, setElements] = useState<ElementPlan[]>(elementsInitiaux);
  const [meta, setMeta] = useState<Meta>(initial);
  const [passe, setPasse] = useState<ElementPlan[][]>([]);
  const [futur, setFutur] = useState<ElementPlan[][]>([]);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [multiple, setMultiple] = useState(false);
  const [aimant, setAimant] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [onglet, setOnglet] = useState<"ajouter" | "musiciens" | "plan" | "materiel">("ajouter");
  const [categorie, setCategorie] = useState<Categorie>("MUSICIEN");
  const [recherche, setRecherche] = useState("");
  const [statut, setStatut] = useState<"enregistre" | "modifie" | "envoi" | "erreur">("enregistre");
  const [erreur, setErreur] = useState<string | null>(null);
  const [choixInstrument, setChoixInstrument] = useState<Record<string, string>>({});
  const [instrumentDefaut, setInstrumentDefaut] = useState<string>("");
  const [, demarrer] = useTransition();
  const svgRef = useRef<SVGSVGElement>(null);
  const geste = useRef<
    | { type: "deplacer"; depart: { x: number; y: number }; origines: Map<string, { x: number; y: number }>; principal: string; bouge: boolean; avant: ElementPlan[] }
    | { type: "tourner"; id: string; avant: ElementPlan[] }
    | null
  >(null);
  const dernierEnvoi = useRef(JSON.stringify({ elements: elementsInitiaux, meta: initial }));

  // --- Historique ---
  // L'état courant est aussi gardé dans une référence : les gestes et l'historique s'en
  // servent sans dépendre du rendu.
  const courant = useRef(elements);
  const poser = useCallback((nouveau: ElementPlan[]) => {
    courant.current = nouveau;
    setElements(nouveau);
  }, []);
  const appliquer = useCallback(
    (suivant: ElementPlan[] | ((e: ElementPlan[]) => ElementPlan[]), avant?: ElementPlan[]) => {
      const precedent = courant.current;
      poser(typeof suivant === "function" ? suivant(precedent) : suivant);
      setPasse((p) => [...p.slice(-99), avant ?? precedent]);
      setFutur([]);
    },
    [poser]
  );
  const annuler = useCallback(() => {
    if (!passe.length) return;
    setFutur((f) => [courant.current, ...f]);
    poser(passe[passe.length - 1]);
    setPasse((p) => p.slice(0, -1));
  }, [passe, poser]);
  const retablir = useCallback(() => {
    if (!futur.length) return;
    setPasse((p) => [...p, courant.current]);
    poser(futur[0]);
    setFutur((f) => f.slice(1));
  }, [futur, poser]);
  const libelleAvant = useRef<ElementPlan[] | null>(null);

  // --- Enregistrement automatique ---
  useEffect(() => {
    const instantane = JSON.stringify({ elements, meta });
    if (instantane === dernierEnvoi.current) return;
    setStatut("modifie");
    const minuteur = setTimeout(() => {
      setStatut("envoi");
      demarrer(async () => {
        const r =
          mode === "plan"
            ? await sauverPlan(id, { titre: meta.titre, notes: meta.notes, largeurCm: meta.largeurCm, profondeurCm: meta.profondeurCm, sceneId: meta.sceneId, classeId: meta.classeId, elements })
            : await sauverScene(id, { nom: meta.titre, notes: meta.notes, largeurCm: meta.largeurCm, profondeurCm: meta.profondeurCm, lieuId: meta.lieuId, elements });
        if (r.ok) dernierEnvoi.current = instantane;
        setStatut(r.ok ? "enregistre" : "erreur");
        setErreur(r.ok ? null : (r.message ?? "Enregistrement impossible."));
      });
    }, 1000);
    return () => clearTimeout(minuteur);
  }, [elements, meta, id, mode]);
  useEffect(() => {
    const avertir = (e: BeforeUnloadEvent) => {
      if (statut !== "enregistre") e.preventDefault();
    };
    window.addEventListener("beforeunload", avertir);
    return () => window.removeEventListener("beforeunload", avertir);
  }, [statut]);

  // Dans l'éditeur d'une scène, ses éléments ne sont pas verrouillés.
  const verrouille = useCallback((e: ElementPlan) => mode === "plan" && e.fixe, [mode]);
  const { chevauchement, dehors } = useMemo(() => problemes(elements, meta.largeurCm, meta.profondeurCm), [elements, meta.largeurCm, meta.profondeurCm]);
  const enConflit = useMemo(() => new Set([...chevauchement, ...dehors]), [chevauchement, dehors]);
  const choisis = elements.filter((e) => selection.has(e.id));
  const seul = choisis.length === 1 ? choisis[0] : null;
  const mobiles = choisis.filter((e) => !verrouille(e));

  // --- Gestes ---
  const point = (ev: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const surElement = (ev: ReactPointerEvent<SVGGElement>, idElement: string) => {
    ev.stopPropagation();
    const e = elements.find((x) => x.id === idElement);
    if (!e) return;
    let sel = selection;
    if (multiple || ev.shiftKey || ev.ctrlKey || ev.metaKey) {
      sel = new Set(selection);
      if (sel.has(idElement)) sel.delete(idElement);
      else sel.add(idElement);
    } else if (!selection.has(idElement)) sel = new Set([idElement]);
    setSelection(sel);
    if (verrouille(e) || !sel.has(idElement)) return;
    const origines = new Map(elements.filter((x) => sel.has(x.id) && !verrouille(x)).map((x) => [x.id, { x: x.x, y: x.y }]));
    geste.current = { type: "deplacer", depart: point(ev), origines, principal: idElement, bouge: false, avant: elements };
    svgRef.current?.setPointerCapture(ev.pointerId);
  };
  const surPoignee = (ev: ReactPointerEvent<SVGCircleElement>, idElement: string) => {
    ev.stopPropagation();
    geste.current = { type: "tourner", id: idElement, avant: elements };
    svgRef.current?.setPointerCapture(ev.pointerId);
  };
  const surFond = () => {
    if (!multiple) setSelection(new Set());
  };
  const surMouvement = (ev: ReactPointerEvent<SVGSVGElement>) => {
    const g = geste.current;
    if (!g) return;
    const p = point(ev);
    if (g.type === "deplacer") {
      let dx = p.x - g.depart.x;
      let dy = p.y - g.depart.y;
      if (!g.bouge && Math.hypot(dx, dy) < 4) return;
      g.bouge = true;
      const o = g.origines.get(g.principal);
      if (o && aimant) {
        dx = aimanter(o.x + dx, PAS_AIMANT) - o.x;
        dy = aimanter(o.y + dy, PAS_AIMANT) - o.y;
      }
      poser(courant.current.map((e) => (g.origines.has(e.id) ? { ...e, x: Math.round(g.origines.get(e.id)!.x + dx), y: Math.round(g.origines.get(e.id)!.y + dy) } : e)));
    } else {
      poser(
        courant.current.map((e) => {
          if (e.id !== g.id) return e;
          const angle = (Math.atan2(p.x - e.x, -(p.y - e.y)) * 180) / Math.PI;
          const pas = aimant ? 15 : 1;
          return { ...e, r: (((Math.round(angle / pas) * pas) % 360) + 360) % 360 };
        })
      );
    }
  };
  const surFin = () => {
    const g = geste.current;
    geste.current = null;
    if (!g) return;
    if (g.type === "deplacer" && !g.bouge) return;
    setPasse((p) => [...p.slice(-99), g.avant]);
    setFutur([]);
  };

  // --- Actions sur la sélection ---
  const modifierChoisis = (f: (e: ElementPlan) => ElementPlan) => appliquer((c) => c.map((e) => (selection.has(e.id) && !verrouille(e) ? f(e) : e)));
  const tourner = (delta: number) => modifierChoisis((e) => ({ ...e, r: (((e.r + delta) % 360) + 360) % 360 }));
  const supprimer = () => {
    appliquer((c) => c.filter((e) => !(selection.has(e.id) && !verrouille(e))));
    setSelection(new Set());
  };
  const dupliquer = () => {
    const copies = mobiles.map((e) => ({ ...e, id: nouvelId(), x: e.x + 30, y: e.y + 30 }));
    appliquer((c) => [...c, ...copies]);
    setSelection(new Set(copies.map((e) => e.id)));
  };

  // Place un nouvel élément sur la première place libre, de l'avant-scène vers le fond.
  const placeLibre = (l: number, p: number, existants: ElementPlan[]) => {
    const L = meta.largeurCm;
    const P = meta.profondeurCm;
    for (let y = Math.round(P * 0.65); y >= p / 2; y -= 40) {
      for (let k = 0; k <= L / 40; k++) {
        const x = Math.round(L / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 40);
        if (x - l / 2 < 0 || x + l / 2 > L) continue;
        const essai = { id: "", x, y, l, p, r: 0, forme: "RECT" } as ElementPlan;
        if (!existants.some((e) => seChevauchent(essai, e))) return { x, y };
      }
    }
    return { x: Math.round(L / 2), y: Math.round(P / 2) };
  };
  const ajouter = (m: ModeleElement, label: string | null = null) => {
    const { x, y } = placeLibre(m.largeurCm, m.profondeurCm, courant.current);
    const e = depuisModele(m, x, y, label);
    appliquer((c) => [...c, e]);
    setSelection(new Set([e.id]));
  };
  const placerMusiciens = (liste: { nom: string; modele: ModeleElement }[]) => {
    const nouveaux: ElementPlan[] = [];
    for (const { nom, modele } of liste) {
      const { x, y } = placeLibre(modele.largeurCm, modele.profondeurCm, [...courant.current, ...nouveaux]);
      nouveaux.push(depuisModele(modele, x, y, nom));
    }
    appliquer((c) => [...c, ...nouveaux]);
    setSelection(new Set(nouveaux.map((e) => e.id)));
  };

  // --- Clavier (ordinateur) ---
  useEffect(() => {
    const clavier = (ev: KeyboardEvent) => {
      const cible = ev.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(cible.tagName)) return;
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") {
        ev.preventDefault();
        if (ev.shiftKey) retablir();
        else annuler();
      } else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "y") {
        ev.preventDefault();
        retablir();
      } else if (selection.size && (ev.key === "Delete" || ev.key === "Backspace")) {
        ev.preventDefault();
        appliquer((c) => c.filter((e) => !(selection.has(e.id) && !verrouille(e))));
        setSelection(new Set());
      } else if (selection.size && ev.key.startsWith("Arrow")) {
        ev.preventDefault();
        const pas = ev.shiftKey ? 50 : 5;
        const [dx, dy] = { ArrowLeft: [-pas, 0], ArrowRight: [pas, 0], ArrowUp: [0, -pas], ArrowDown: [0, pas] }[ev.key] ?? [0, 0];
        appliquer((c) => c.map((e) => (selection.has(e.id) && !verrouille(e) ? { ...e, x: e.x + dx, y: e.y + dy } : e)));
      } else if (ev.key === "Escape") setSelection(new Set());
    };
    window.addEventListener("keydown", clavier);
    return () => window.removeEventListener("keydown", clavier);
  }, [selection, annuler, retablir, appliquer, verrouille]);

  // --- Musiciens à placer ---
  // Un élève est déjà placé si son nom (même partiel : « Cassandre » / « Cassandre PODKOWA »)
  // figure sur un élément.
  const etiquettes = elements.map((e) => (e.label ? mots(e.label) : [])).filter((m) => m.length);
  const estPlace = (nom: string) => {
    const m = mots(nom);
    return etiquettes.some((l) => m.every((x) => l.includes(x)) || l.every((x) => m.includes(x)));
  };
  const tousMembres = [...(membres[""] ?? []), ...(meta.classeId ? (membres[meta.classeId] ?? []) : [])];
  const listeMembres = tousMembres.filter((m, i, t) => t.findIndex((x) => x.nom === m.nom) === i && !estPlace(m.nom));
  const instrumentsCatalogue = catalogue.filter((m) => m.categorie === "MUSICIEN" || /^piano/i.test(m.nom));
  // Instrument proposé quand l'annuaire ne le connaît pas : celui que le nom de l'ensemble
  // évoque (« Ensemble de clarinettes »), ou celui choisi par défaut.
  const nomEnsemble = classes.find((c) => c.id === meta.classeId)?.nom ?? "";
  const defaut = (instrumentDefaut ? catalogue.find((c) => c.id === instrumentDefaut) : null) ?? elementPourInstrument(nomEnsemble, instrumentsCatalogue);
  const modelePour = (m: Membre) => {
    const choisi = choixInstrument[m.nom];
    return (choisi ? catalogue.find((c) => c.id === choisi) : null) ?? elementPourInstrument(m.instrument, instrumentsCatalogue) ?? defaut ?? null;
  };

  const stock = inventaire(elements);
  const filtres = catalogue.filter((m) => (recherche ? m.nom.toLowerCase().includes(recherche.toLowerCase()) : m.categorie === categorie));

  const changerScene = (sceneId: string | null) => {
    const s = scenes.find((x) => x.id === sceneId);
    setMeta((m) => ({ ...m, sceneId, ...(s ? { largeurCm: s.largeurCm, profondeurCm: s.profondeurCm } : {}) }));
    if (s) appliquer((c) => [...s.elements.map((e) => ({ ...e, id: nouvelId(), fixe: true })), ...c.filter((e) => !e.fixe)]);
  };

  const libelleStatut = { enregistre: "✓ Enregistré", modifie: "Modifications…", envoi: "Enregistrement…", erreur: "⚠ Non enregistré" }[statut];
  const nbMusiciens = musiciens(elements);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={retour.href} className="text-sm text-brand-accent hover:underline">
          ‹ {retour.libelle}
        </Link>
        <span className={`text-xs ${statut === "erreur" ? "text-status-occupee" : "text-slate-500"}`}>
          {libelleStatut}
          {erreur && ` : ${erreur}`}
        </span>
      </div>
      <input
        value={meta.titre}
        onChange={(e) => setMeta((m) => ({ ...m, titre: e.target.value }))}
        aria-label={mode === "plan" ? "Titre du plan" : "Nom de la scène"}
        className="w-full rounded-md border border-transparent bg-transparent px-1 text-lg font-semibold text-brand-slate hover:border-slate-200 focus:border-brand-accent focus:outline-none"
      />

      {/* Barre d'outils */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1.5 rounded-lg bg-white/95 p-2 shadow-sm backdrop-blur">
        <button type="button" onClick={annuler} disabled={!passe.length} className={bouton} aria-label="Annuler">
          <IconArrowBackUp size={16} aria-hidden />
        </button>
        <button type="button" onClick={retablir} disabled={!futur.length} className={bouton} aria-label="Rétablir">
          <IconArrowForwardUp size={16} aria-hidden />
        </button>
        <span className="mx-0.5 h-5 w-px bg-slate-200" />
        <button type="button" onClick={() => tourner(-15)} disabled={!mobiles.length} className={bouton} aria-label="Tourner à gauche">
          <IconRotate size={16} aria-hidden />
        </button>
        <button type="button" onClick={() => tourner(15)} disabled={!mobiles.length} className={bouton} aria-label="Tourner à droite">
          <IconRotateClockwise size={16} aria-hidden />
        </button>
        <button type="button" onClick={dupliquer} disabled={!mobiles.length} className={bouton} aria-label="Dupliquer">
          <IconCopy size={16} aria-hidden />
        </button>
        <button type="button" onClick={supprimer} disabled={!mobiles.length} className={`${bouton} text-status-occupee`} aria-label="Supprimer">
          <IconTrash size={16} aria-hidden />
        </button>
        <span className="mx-0.5 h-5 w-px bg-slate-200" />
        <button type="button" onClick={() => appliquer((c) => disposerEnArc(c, selection, meta.largeurCm, meta.profondeurCm))} disabled={mobiles.length < 2} className={bouton}>
          ◠ En arc
        </button>
        <button type="button" onClick={() => appliquer((c) => disposerEnArc(c, selection, meta.largeurCm, meta.profondeurCm, 2))} disabled={mobiles.length < 4} className={bouton}>
          ◠◠ 2 rangs
        </button>
        <button type="button" onClick={() => appliquer((c) => alignerEnLigne(c, selection))} disabled={mobiles.length < 2} className={bouton}>
          ▭▭ En ligne
        </button>
        <span className="mx-0.5 h-5 w-px bg-slate-200" />
        <button type="button" onClick={() => setMultiple((m) => !m)} className={`${bouton} ${multiple ? "border-brand-accent bg-brand-accent/10 text-brand-accent" : ""}`} aria-pressed={multiple}>
          <IconSelectAll size={16} aria-hidden /> Sélection multiple
        </button>
        <button
          type="button"
          onClick={() => setSelection(new Set(elements.filter((e) => !verrouille(e) && e.categorie === "MUSICIEN").map((e) => e.id)))}
          className={bouton}
        >
          Tous les musiciens
        </button>
        <button type="button" onClick={() => setAimant((a) => !a)} className={`${bouton} ${aimant ? "border-brand-accent bg-brand-accent/10 text-brand-accent" : ""}`} aria-pressed={aimant}>
          <IconMagnet size={16} aria-hidden /> Aimanter
        </button>
        <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} disabled={zoom <= 1} className={bouton} aria-label="Dézoomer">
          <IconZoomOut size={16} aria-hidden />
        </button>
        <button type="button" onClick={() => setZoom((z) => Math.min(3, z + 0.5))} disabled={zoom >= 3} className={bouton} aria-label="Zoomer">
          <IconZoomIn size={16} aria-hidden />
        </button>
        {impression && (
          <a href={impression} target="_blank" rel="noopener" className={bouton}>
            <IconPrinter size={16} aria-hidden /> Imprimer
          </a>
        )}
      </div>

      {/* Scène */}
      <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
        <div style={{ width: `${zoom * 100}%` }}>
          <DessinPlan
            largeur={meta.largeurCm}
            profondeur={meta.profondeurCm}
            elements={elements}
            selection={selection}
            enConflit={enConflit}
            svgRef={svgRef}
            surElement={surElement}
            surFond={surFond}
            surPoignee={surPoignee}
            surMouvement={surMouvement}
            surFin={surFin}
            className="block h-auto w-full"
          />
        </div>
      </div>
      <div className="-mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>
          {nbMusiciens} musicien{nbMusiciens > 1 ? "s" : ""} · {stock.get("Chaise") ?? 0} chaise{(stock.get("Chaise") ?? 0) > 1 ? "s" : ""} ·{" "}
          {stock.get("Pupitre") ?? 0} pupitre{(stock.get("Pupitre") ?? 0) > 1 ? "s" : ""}
        </span>
        {chevauchement.size > 0 && <span className="text-status-occupee">⚠ {chevauchement.size} éléments se chevauchent</span>}
        {dehors.size > 0 && <span className="text-status-occupee">⚠ {dehors.size} dépasse{dehors.size > 1 ? "nt" : ""} de la scène</span>}
        <span className="hidden sm:inline">Glisser pour déplacer · rond bleu pour tourner · Maj+clic pour en choisir plusieurs</span>
      </div>

      {/* Élément choisi */}
      {seul && (
        <section className="grid gap-2 rounded-lg bg-white p-3 shadow-sm sm:grid-cols-4">
          <p className="text-sm font-semibold text-brand-slate sm:col-span-4">
            {seul.nom}
            {verrouille(seul) && <span className="ml-2 text-xs font-normal text-slate-500">🔒 élément fixe de la scène</span>}
          </p>
          {!verrouille(seul) && (
            <>
              <label className="flex flex-col gap-1 text-xs text-slate-600 sm:col-span-2">
                {seul.categorie === "MUSICIEN" ? "Musicien" : "Précision affichée"}
                <input
                  list="noms-plan"
                  value={seul.label ?? ""}
                  onFocus={() => (libelleAvant.current = courant.current)}
                  onChange={(e) => {
                    const v = e.target.value;
                    poser(courant.current.map((x) => (x.id === seul.id ? { ...x, label: v || null } : x)));
                  }}
                  onBlur={() => {
                    const avant = libelleAvant.current;
                    libelleAvant.current = null;
                    if (avant && avant !== courant.current) {
                      setPasse((p) => [...p.slice(-99), avant]);
                      setFutur([]);
                    }
                  }}
                  placeholder={seul.categorie === "MUSICIEN" ? "Nom de l'élève" : "Ex. « Piano de la salle »"}
                  className={champ}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-600">
                Largeur (cm)
                <input type="number" min={10} max={2000} value={seul.l} onChange={(e) => modifierChoisis((x) => ({ ...x, l: Math.max(10, Number(e.target.value) || 10) }))} className={champ} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-600">
                Profondeur (cm)
                <input type="number" min={10} max={2000} value={seul.p} onChange={(e) => modifierChoisis((x) => ({ ...x, p: Math.max(10, Number(e.target.value) || 10) }))} className={champ} />
              </label>
              {seul.categorie === "MUSICIEN" && (
                <div className="flex flex-wrap gap-4 text-sm text-slate-700 sm:col-span-4">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={seul.chaise} onChange={(e) => modifierChoisis((x) => ({ ...x, chaise: e.target.checked }))} className="accent-brand-accent" /> Chaise
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={seul.pupitre} onChange={(e) => modifierChoisis((x) => ({ ...x, pupitre: e.target.checked }))} className="accent-brand-accent" /> Pupitre
                  </label>
                  <button type="button" onClick={() => modifierChoisis((x) => ({ ...x, r: 0 }))} className="text-xs text-brand-accent underline">
                    Face au public
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}
      <datalist id="noms-plan">
        {tousMembres.map((m) => (
          <option key={m.nom} value={m.nom} />
        ))}
      </datalist>

      {/* Panneaux */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {(
          [
            ["ajouter", "Ajouter"],
            ...(mode === "plan" ? [["musiciens", `Musiciens à placer${listeMembres.length ? ` (${listeMembres.length})` : ""}`]] : []),
            ["plan", mode === "plan" ? "Plan et scène" : "La scène"],
            ["materiel", "Matériel"],
          ] as [typeof onglet, string][]
        ).map(([v, lib]) => (
          <button
            key={v}
            type="button"
            onClick={() => setOnglet(v)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${onglet === v ? "border-brand-accent font-semibold text-brand-accent" : "border-transparent text-slate-600"}`}
          >
            {lib}
          </button>
        ))}
      </div>

      {onglet === "ajouter" && (
        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCategorie(c);
                  setRecherche("");
                }}
                className={`rounded-full px-3 py-1 text-xs ${categorie === c && !recherche ? "bg-brand-slate text-white" : "bg-white text-slate-600 shadow-sm"}`}
              >
                {LIBELLE_CATEGORIE[c]}
              </button>
            ))}
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Chercher…" className="ml-auto w-32 rounded-md border border-slate-300 px-2 py-1 text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {filtres.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => ajouter(m)}
                className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-left text-xs hover:border-brand-accent"
              >
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: m.couleur }} />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">{m.nom}</span>
                  <span className="text-slate-400">
                    {m.largeurCm}×{m.profondeurCm}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400">Les tailles (en cm, largeur × profondeur) se modifient ensuite élément par élément. La direction complète le catalogue.</p>
        </section>
      )}

      {onglet === "musiciens" && mode === "plan" && (
        <section className="flex flex-col gap-2 rounded-lg bg-white p-3 shadow-sm">
          {!meta.classeId && !(membres[""] ?? []).length && <p className="text-sm text-slate-500">Choisissez l&apos;ensemble dans « Plan et scène » pour retrouver ses élèves.</p>}
          {listeMembres.length === 0 && (meta.classeId || (membres[""] ?? []).length > 0) && <p className="text-sm text-slate-500">Tout le monde est placé.</p>}
          {listeMembres.length > 0 && (
            <label className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              Instrument par défaut (quand l&apos;annuaire ne le connaît pas) :
              <select value={instrumentDefaut || defaut?.id || ""} onChange={(e) => setInstrumentDefaut(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">
                <option value="">—</option>
                {instrumentsCatalogue.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </label>
          )}
          {listeMembres.map((m) => {
            const modele = modelePour(m);
            return (
              <div key={m.nom} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="min-w-32 flex-1 font-medium text-slate-800">{m.nom}</span>
                <select
                  value={choixInstrument[m.nom] ?? modele?.id ?? ""}
                  onChange={(e) => setChoixInstrument((c) => ({ ...c, [m.nom]: e.target.value }))}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                >
                  <option value="">Instrument…</option>
                  {instrumentsCatalogue.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
                <button type="button" disabled={!modele} onClick={() => modele && placerMusiciens([{ nom: m.nom, modele }])} className={bouton}>
                  Placer
                </button>
              </div>
            );
          })}
          {listeMembres.length > 1 && (
            <button
              type="button"
              onClick={() =>
                placerMusiciens(
                  listeMembres.flatMap((m) => {
                    const modele = modelePour(m);
                    return modele ? [{ nom: m.nom, modele }] : [];
                  })
                )
              }
              className="w-fit rounded-md bg-brand-accent px-3 py-1.5 text-sm font-semibold text-white"
            >
              Placer tout le monde
            </button>
          )}
          <p className="text-xs text-slate-400">Une fois placés, ils restent sélectionnés : « En arc » les dispose autour du chef.</p>
        </section>
      )}

      {onglet === "plan" && (
        <section className="grid gap-3 rounded-lg bg-white p-3 shadow-sm sm:grid-cols-2">
          {mode === "plan" && (
            <label className="flex flex-col gap-1 text-xs text-slate-600">
              Scène
              <select value={meta.sceneId ?? ""} onChange={(e) => changerScene(e.target.value || null)} className={champ}>
                <option value="">Autre (dimensions libres)</option>
                {scenes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom} ({metres(s.largeurCm)} × {metres(s.profondeurCm)})
                  </option>
                ))}
              </select>
            </label>
          )}
          {mode === "plan" ? (
            <label className="flex flex-col gap-1 text-xs text-slate-600">
              Ensemble concerné
              <select value={meta.classeId ?? ""} onChange={(e) => setMeta((m) => ({ ...m, classeId: e.target.value || null }))} className={champ}>
                <option value="">—</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="flex flex-col gap-1 text-xs text-slate-600">
              Commune
              <select value={meta.lieuId ?? ""} onChange={(e) => setMeta((m) => ({ ...m, lieuId: e.target.value || null }))} className={champ}>
                <option value="">—</option>
                {lieux.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nom}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1 text-xs text-slate-600">
            Largeur (m), de jardin à cour
            <input
              type="number"
              step={0.1}
              min={0.5}
              max={50}
              value={meta.largeurCm / 100}
              onChange={(e) => setMeta((m) => ({ ...m, largeurCm: Math.round(Math.min(50, Math.max(0.5, Number(e.target.value) || 0.5)) * 100) }))}
              className={champ}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-600">
            Profondeur (m), du fond à l&apos;avant-scène
            <input
              type="number"
              step={0.1}
              min={0.5}
              max={50}
              value={meta.profondeurCm / 100}
              onChange={(e) => setMeta((m) => ({ ...m, profondeurCm: Math.round(Math.min(50, Math.max(0.5, Number(e.target.value) || 0.5)) * 100) }))}
              className={champ}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-600 sm:col-span-2">
            Notes {mode === "plan" ? "(sonorisation, éclairage, consignes de changement…)" : "(accès, prises, contact technique…)"}
            <textarea rows={3} value={meta.notes} onChange={(e) => setMeta((m) => ({ ...m, notes: e.target.value }))} className={champ} />
          </label>
          {mode === "scene" && (
            <p className="text-xs text-slate-500 sm:col-span-2">
              Placez ici ce qui ne bouge pas : piano de la salle, piliers, escaliers, zones inutilisables, prises… Ils apparaîtront verrouillés
              dans chaque plan fait sur cette scène.
            </p>
          )}
        </section>
      )}

      {onglet === "materiel" && (
        <section className="flex flex-col gap-1 rounded-lg bg-white p-3 text-sm shadow-sm">
          <p className="font-semibold text-brand-slate">À installer sur le plateau</p>
          {stock.size === 0 && <p className="text-slate-500">Rien pour l&apos;instant.</p>}
          <ul className="grid gap-x-6 sm:grid-cols-2">
            {[...stock.entries()].map(([nom, n]) => (
              <li key={nom} className="flex justify-between border-b border-slate-100 py-1">
                <span>{nom}</span>
                <span className="font-semibold tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-400">Chaises et pupitres des musiciens compris ; les éléments fixes de la scène ne sont pas comptés.</p>
        </section>
      )}
    </div>
  );
}
