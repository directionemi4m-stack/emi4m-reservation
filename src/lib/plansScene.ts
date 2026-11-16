// Plans de scène : modèle de données et géométrie, sans dépendance (client et serveur).
// Repère en centimètres : x de jardin à cour (gauche → droite vu du public… dessiné tel que
// la salle le voit), y du fond de scène (0) vers l'avant-scène (profondeur). Un élément est
// placé par son centre ; à rotation 0, son avant (pupitre) regarde le public (y croissant).

export type Categorie = "MUSICIEN" | "MOBILIER" | "MATERIEL" | "DECOR";
export type Forme = "RECT" | "ROND";

export interface ElementPlan {
  id: string;
  nom: string; // type d'élément : « Violoncelle », « Pupitre »…
  categorie: Categorie;
  l: number; // largeur (cm)
  p: number; // profondeur (cm)
  forme: Forme;
  couleur: string;
  abrege: string | null;
  chaise: boolean;
  pupitre: boolean;
  x: number;
  y: number;
  r: number; // rotation en degrés, sens horaire
  label: string | null; // nom du musicien, précision…
  fixe: boolean; // élément de la scène (pilier, piano fixe…) : verrouillé dans les plans
}

export interface ModeleElement {
  nom: string;
  categorie: Categorie;
  largeurCm: number;
  profondeurCm: number;
  forme: Forme;
  couleur: string;
  abrege: string | null;
  chaise: boolean;
  pupitre: boolean;
  motsCles?: string | null;
}

export const LIBELLE_CATEGORIE: Record<Categorie, string> = {
  MUSICIEN: "Musiciens",
  MOBILIER: "Mobilier",
  MATERIEL: "Matériel",
  DECOR: "Scène",
};

export const DIMENSION_MIN = 10;
export const DIMENSION_MAX = 5000; // 50 m
export const MAX_ELEMENTS = 400;

const borne = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const nombre = (v: unknown, defaut: number) => (typeof v === "number" && Number.isFinite(v) ? v : defaut);
const texte = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const CATEGORIES: Categorie[] = ["MUSICIEN", "MOBILIER", "MATERIEL", "DECOR"];

export const nouvelId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// Relit (et assainit) la liste d'éléments enregistrée en JSON.
export function lireElements(brut: unknown): ElementPlan[] {
  if (!Array.isArray(brut)) return [];
  const vus = new Set<string>();
  const sortie: ElementPlan[] = [];
  for (const e of brut.slice(0, MAX_ELEMENTS)) {
    if (!e || typeof e !== "object") continue;
    const o = e as Record<string, unknown>;
    let id = texte(o.id, 40) ?? nouvelId();
    if (vus.has(id)) id = nouvelId();
    vus.add(id);
    sortie.push({
      id,
      nom: texte(o.nom, 80) ?? "Élément",
      categorie: CATEGORIES.includes(o.categorie as Categorie) ? (o.categorie as Categorie) : "MATERIEL",
      l: Math.round(borne(nombre(o.l, 50), DIMENSION_MIN, 2000)),
      p: Math.round(borne(nombre(o.p, 50), DIMENSION_MIN, 2000)),
      forme: o.forme === "ROND" ? "ROND" : "RECT",
      couleur: typeof o.couleur === "string" && /^#[0-9a-fA-F]{6}$/.test(o.couleur) ? o.couleur : "#64748b",
      abrege: texte(o.abrege, 12),
      chaise: o.chaise === true,
      pupitre: o.pupitre === true,
      x: Math.round(borne(nombre(o.x, 0), -2000, 7000)),
      y: Math.round(borne(nombre(o.y, 0), -2000, 7000)),
      r: ((Math.round(nombre(o.r, 0)) % 360) + 360) % 360,
      label: texte(o.label, 60),
      fixe: o.fixe === true,
    });
  }
  return sortie;
}

export function depuisModele(m: ModeleElement, x: number, y: number, label: string | null = null): ElementPlan {
  return {
    id: nouvelId(),
    nom: m.nom,
    categorie: m.categorie,
    l: m.largeurCm,
    p: m.profondeurCm,
    forme: m.forme,
    couleur: m.couleur,
    abrege: m.abrege,
    chaise: m.chaise,
    pupitre: m.pupitre,
    x,
    y,
    r: 0,
    label,
    fixe: false,
  };
}

// --- Géométrie ---

type Point = { x: number; y: number };

export function coins(e: Pick<ElementPlan, "x" | "y" | "l" | "p" | "r">): Point[] {
  const a = (e.r * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    [-e.l / 2, -e.p / 2],
    [e.l / 2, -e.p / 2],
    [e.l / 2, e.p / 2],
    [-e.l / 2, e.p / 2],
  ].map(([dx, dy]) => ({ x: e.x + dx * c - dy * s, y: e.y + dx * s + dy * c }));
}

// Séparation des axes : deux rectangles tournés se chevauchent-ils (marge de tolérance en cm,
// pour ne pas signaler deux éléments simplement collés) ?
export function seChevauchent(a: ElementPlan, b: ElementPlan, tolerance = 2): boolean {
  if (a.forme === "ROND" && b.forme === "ROND") {
    return Math.hypot(a.x - b.x, a.y - b.y) < (Math.min(a.l, a.p) + Math.min(b.l, b.p)) / 2 - tolerance;
  }
  const pa = coins(a);
  const pb = coins(b);
  for (const poly of [pa, pb]) {
    for (let i = 0; i < 4; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % 4];
      const nx = p2.y - p1.y;
      const ny = p1.x - p2.x;
      const longueur = Math.hypot(nx, ny) || 1;
      const proj = (pts: Point[]) => pts.map((q) => (q.x * nx + q.y * ny) / longueur);
      const ra = proj(pa);
      const rb = proj(pb);
      if (Math.max(...ra) - tolerance <= Math.min(...rb) || Math.max(...rb) - tolerance <= Math.min(...ra)) return false;
    }
  }
  return true;
}

// Les éléments en conflit : chevauchement, ou dépassement de la scène.
export function problemes(elements: ElementPlan[], largeur: number, profondeur: number) {
  const chevauchement = new Set<string>();
  const dehors = new Set<string>();
  for (let i = 0; i < elements.length; i++) {
    const a = elements[i];
    if (coins(a).some((q) => q.x < -1 || q.y < -1 || q.x > largeur + 1 || q.y > profondeur + 1)) dehors.add(a.id);
    for (let j = i + 1; j < elements.length; j++) {
      const b = elements[j];
      // Un pupitre ou une chaise posés sur un praticable, un musicien sur une estrade : on
      // ne signale pas ce qui se pose sur un praticable.
      if (/praticable/i.test(a.nom) || /praticable/i.test(b.nom)) continue;
      if (seChevauchent(a, b)) {
        chevauchement.add(a.id);
        chevauchement.add(b.id);
      }
    }
  }
  return { chevauchement, dehors };
}

export const aimanter = (v: number, pas: number) => (pas > 0 ? Math.round(v / pas) * pas : Math.round(v));

// Disposition en arc, comme un orchestre autour du chef : les éléments (pris de gauche à
// droite) sont répartis sur un arc centré sur le milieu de l'avant-scène, chacun tourné vers
// ce centre. Le rayon s'adapte pour que les éléments ne se touchent pas.
export function disposerEnArc(elements: ElementPlan[], ids: Set<string>, largeur: number, profondeur: number, rangees = 1): ElementPlan[] {
  const choisis = elements.filter((e) => ids.has(e.id) && !e.fixe).sort((a, b) => a.x - b.x);
  if (choisis.length < 2) return elements;
  const centre = { x: largeur / 2, y: profondeur - 40 };
  const parRangee = Math.ceil(choisis.length / rangees);
  const placement = new Map<string, { x: number; y: number; r: number }>();
  let rayonPrecedent = 0;
  for (let k = 0; k < rangees; k++) {
    const rangee = choisis.slice(k * parRangee, (k + 1) * parRangee);
    if (!rangee.length) break;
    const largeurTotale = rangee.reduce((s, e) => s + e.l, 0) * 1.08;
    const profondeurMax = Math.max(...rangee.map((e) => e.p));
    const ouverture = Math.min(Math.PI * 0.85, Math.max(Math.PI / 3, largeurTotale / 250));
    // Les angles sont calculés sur le bord intérieur de l'arc (côté chef), le plus serré.
    const interieur = Math.max(largeurTotale / ouverture, rayonPrecedent + 20, 120);
    const rayon = interieur + profondeurMax / 2;
    rayonPrecedent = rayon + profondeurMax / 2;
    let cumul = -largeurTotale / 2;
    for (const e of rangee) {
      const milieu = cumul + (e.l * 1.08) / 2;
      cumul += e.l * 1.08;
      const theta = milieu / interieur;
      placement.set(e.id, {
        x: Math.round(centre.x + rayon * Math.sin(theta)),
        y: Math.round(centre.y - rayon * Math.cos(theta)),
        r: Math.round((((theta * 180) / Math.PI) % 360 + 360) % 360),
      });
    }
  }
  return elements.map((e) => (placement.has(e.id) ? { ...e, ...placement.get(e.id)! } : e));
}

// Alignement en ligne droite, de gauche à droite, à la hauteur moyenne, tournés vers le public.
export function alignerEnLigne(elements: ElementPlan[], ids: Set<string>, ecart = 10): ElementPlan[] {
  const choisis = elements.filter((e) => ids.has(e.id) && !e.fixe).sort((a, b) => a.x - b.x);
  if (choisis.length < 2) return elements;
  const y = Math.round(choisis.reduce((s, e) => s + e.y, 0) / choisis.length);
  const largeurTotale = choisis.reduce((s, e) => s + e.l, 0) + ecart * (choisis.length - 1);
  const centreX = (Math.min(...choisis.map((e) => e.x)) + Math.max(...choisis.map((e) => e.x))) / 2;
  let x = centreX - largeurTotale / 2;
  const placement = new Map<string, number>();
  for (const e of choisis) {
    placement.set(e.id, Math.round(x + e.l / 2));
    x += e.l + ecart;
  }
  return elements.map((e) => (placement.has(e.id) ? { ...e, x: placement.get(e.id)!, y, r: 0 } : e));
}

// --- Matériel à installer, et changements entre deux passages ---

export type Inventaire = Map<string, number>;

// Ce qu'il faut sur le plateau : chaises et pupitres (ceux des musiciens compris), puis le
// matériel et le mobilier par type. Les éléments fixes de la scène ne comptent pas.
export function inventaire(elements: ElementPlan[]): Inventaire {
  const total: Inventaire = new Map();
  const ajouter = (nom: string, n = 1) => total.set(nom, (total.get(nom) ?? 0) + n);
  for (const e of elements) {
    if (e.fixe || e.categorie === "DECOR") continue;
    if (e.categorie === "MUSICIEN") {
      if (e.chaise) ajouter("Chaise");
      if (e.pupitre) ajouter("Pupitre");
      continue;
    }
    ajouter(e.nom);
  }
  return total;
}

export const musiciens = (elements: ElementPlan[]) => elements.filter((e) => e.categorie === "MUSICIEN" && !e.fixe).length;

// Ce qui change d'un passage au suivant : quantités à ajouter (+) ou à retirer (−).
export function changements(avant: ElementPlan[], apres: ElementPlan[]): { nom: string; delta: number }[] {
  const a = inventaire(avant);
  const b = inventaire(apres);
  const noms = [...new Set([...a.keys(), ...b.keys()])];
  return noms
    .map((nom) => ({ nom, delta: (b.get(nom) ?? 0) - (a.get(nom) ?? 0) }))
    .filter((c) => c.delta !== 0)
    .sort((x, y) => (x.nom === "Chaise" ? -1 : y.nom === "Chaise" ? 1 : x.nom === "Pupitre" ? -1 : y.nom === "Pupitre" ? 1 : x.nom.localeCompare(y.nom)));
}

// Reconnaît l'élément du catalogue correspondant à un instrument saisi (« violoncelle »,
// « Clarinette sib »…), par ses mots-clés puis par son nom.
const normaliser = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
export function elementPourInstrument<T extends ModeleElement>(instrument: string | null | undefined, catalogue: T[]): T | null {
  if (!instrument) return null;
  const cherche = normaliser(instrument);
  let meilleur: { e: T; score: number } | null = null;
  for (const e of catalogue) {
    if (e.categorie !== "MUSICIEN" && e.categorie !== "MATERIEL") continue;
    const cles = [e.nom, ...(e.motsCles ?? "").split(",")].map(normaliser).filter(Boolean);
    for (const c of cles) {
      const score = cherche === c ? 100 + c.length : cherche.startsWith(c) || cherche.includes(c) ? c.length : 0;
      if (score > 0 && (!meilleur || score > meilleur.score)) meilleur = { e, score };
    }
  }
  return meilleur?.e ?? null;
}

export const metres = (cm: number) => `${(cm / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;

// « Chaise +2 · Piano à queue −1 » / « Chaise ×5 » : sans accord à faire selon le nombre.
export const texteChangements = (c: { nom: string; delta: number }[]) => c.map((x) => `${x.nom} ${x.delta > 0 ? "+" : "−"}${Math.abs(x.delta)}`).join(" · ");
export const texteInventaire = (stock: Inventaire) => [...stock.entries()].map(([nom, n]) => `${nom} ×${n}`).join(" · ");
