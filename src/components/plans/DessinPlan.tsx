import type { PointerEvent as ReactPointerEvent, Ref } from "react";
import { metres, type ElementPlan } from "@/lib/plansScene";

export const MARGE_DESSIN = 70; // cm autour de la scène, pour les cotes et la mention du public

// Dessin d'un plan de scène en SVG, à l'échelle (1 unité = 1 cm). Sert à l'éditeur (avec la
// sélection et les gestes) comme à l'impression.
export function DessinPlan({
  largeur,
  profondeur,
  elements,
  selection,
  enConflit,
  svgRef,
  surElement,
  surFond,
  surPoignee,
  surMouvement,
  surFin,
  className,
}: {
  largeur: number;
  profondeur: number;
  elements: ElementPlan[];
  selection?: Set<string>;
  enConflit?: Set<string>;
  svgRef?: Ref<SVGSVGElement>;
  surElement?: (e: ReactPointerEvent<SVGGElement>, id: string) => void;
  surFond?: (e: ReactPointerEvent<SVGSVGElement>) => void;
  surPoignee?: (e: ReactPointerEvent<SVGCircleElement>, id: string) => void;
  surMouvement?: (e: ReactPointerEvent<SVGSVGElement>) => void;
  surFin?: () => void;
  className?: string;
}) {
  const M = MARGE_DESSIN;
  const police = Math.max(14, Math.min(28, Math.max(largeur, profondeur) / 45));
  const lignes: { v: number; fort: boolean; vertical: boolean }[] = [];
  for (let x = 50; x < largeur; x += 50) lignes.push({ v: x, fort: x % 100 === 0, vertical: true });
  for (let y = 50; y < profondeur; y += 50) lignes.push({ v: y, fort: y % 100 === 0, vertical: false });
  // Praticables et éléments de la scène dessous, le reste par-dessus.
  const ordre = (e: ElementPlan) => (e.categorie === "DECOR" ? 0 : /praticable/i.test(e.nom) ? 1 : 2);
  const tries = [...elements].sort((a, b) => ordre(a) - ordre(b));
  const seul = selection && selection.size === 1 ? elements.find((e) => selection.has(e.id) && !e.fixe) : undefined;

  return (
    <svg
      ref={svgRef}
      viewBox={`${-M} ${-M} ${largeur + 2 * M} ${profondeur + 2 * M + 30}`}
      className={className}
      onPointerDown={surFond}
      onPointerMove={surMouvement}
      onPointerUp={surFin}
      onPointerCancel={surFin}
      style={{ touchAction: surElement ? "none" : undefined, userSelect: "none" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="hachures" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="16" stroke="#a8a29e" strokeWidth="5" />
        </pattern>
      </defs>
      <rect x={0} y={0} width={largeur} height={profondeur} fill="#f8fafc" />
      {lignes.map((l) =>
        l.vertical ? (
          <line key={`v${l.v}`} x1={l.v} y1={0} x2={l.v} y2={profondeur} stroke={l.fort ? "#cbd5e1" : "#e2e8f0"} strokeWidth={l.fort ? 1.6 : 1} />
        ) : (
          <line key={`h${l.v}`} x1={0} y1={l.v} x2={largeur} y2={l.v} stroke={l.fort ? "#cbd5e1" : "#e2e8f0"} strokeWidth={l.fort ? 1.6 : 1} />
        )
      )}
      <rect x={0} y={0} width={largeur} height={profondeur} fill="none" stroke="#2C3E50" strokeWidth={5} />
      <text x={largeur / 2} y={-M / 2 + 4} textAnchor="middle" fontSize={police} fill="#64748b">
        Fond de scène · {metres(largeur)}
      </text>
      <text x={-M / 2} y={profondeur / 2} textAnchor="middle" fontSize={police} fill="#64748b" transform={`rotate(-90 ${-M / 2} ${profondeur / 2})`}>
        {metres(profondeur)}
      </text>
      <text x={largeur / 2} y={profondeur + M / 2 + 10} textAnchor="middle" fontSize={police * 1.15} fontWeight={700} fill="#2C3E50">
        ▼ PUBLIC ▼
      </text>
      <text x={0} y={profondeur + M / 2 + 10} fontSize={police * 0.8} fill="#94a3b8">
        Jardin
      </text>
      <text x={largeur} y={profondeur + M / 2 + 10} textAnchor="end" fontSize={police * 0.8} fill="#94a3b8">
        Cour
      </text>

      {tries.map((e) => {
        const choisi = selection?.has(e.id);
        const conflit = enConflit?.has(e.id);
        const contour = choisi ? "#2980B9" : conflit ? "#dc2626" : e.couleur;
        const zone = e.categorie === "DECOR" && /inutilisable/i.test(e.nom);
        return (
          <g
            key={e.id}
            transform={`translate(${e.x} ${e.y}) rotate(${e.r})`}
            onPointerDown={surElement ? (ev) => surElement(ev, e.id) : undefined}
            style={{ cursor: surElement ? (e.fixe ? "not-allowed" : "grab") : undefined }}
          >
            {e.forme === "ROND" ? (
              <ellipse rx={e.l / 2} ry={e.p / 2} fill={e.couleur} fillOpacity={0.22} stroke={contour} strokeWidth={choisi ? 6 : 3} strokeDasharray={conflit && !choisi ? "10 6" : undefined} />
            ) : (
              <rect
                x={-e.l / 2}
                y={-e.p / 2}
                width={e.l}
                height={e.p}
                rx={6}
                fill={zone ? "url(#hachures)" : e.couleur}
                fillOpacity={zone ? 1 : e.categorie === "DECOR" ? 0.35 : 0.18}
                stroke={contour}
                strokeWidth={choisi ? 6 : 3}
                strokeDasharray={(conflit && !choisi) || e.fixe ? "10 6" : undefined}
              />
            )}
            {e.categorie === "MUSICIEN" && e.chaise && (
              <rect x={-20} y={-e.p / 2 + 8} width={40} height={36} rx={6} fill={e.couleur} fillOpacity={0.4} />
            )}
            {e.categorie === "MUSICIEN" && e.pupitre && <rect x={-24} y={e.p / 2 - 16} width={48} height={7} rx={3} fill={e.couleur} />}
            {e.categorie === "MUSICIEN" && !e.pupitre && <path d={`M -12 ${e.p / 2 - 18} L 12 ${e.p / 2 - 18} L 0 ${e.p / 2 - 6} Z`} fill={e.couleur} />}
          </g>
        );
      })}

      {/* Textes jamais tournés, pour rester lisibles. */}
      {tries.map((e) => {
        const titre = e.abrege ?? e.nom;
        const petit = Math.min(e.l, e.p) < 60;
        return (
          <g key={`t${e.id}`} pointerEvents="none">
            {titre && (
              <text x={e.x} y={e.y + (e.label ? -police * 0.15 : police * 0.35)} textAnchor="middle" fontSize={petit ? police * 0.7 : police} fontWeight={700} fill="#1e293b">
                {titre}
              </text>
            )}
            {e.label && (
              <text x={e.x} y={e.y + police * 0.95} textAnchor="middle" fontSize={police * 0.78} fill="#334155">
                {e.label.length > 18 ? `${e.label.slice(0, 17)}…` : e.label}
              </text>
            )}
          </g>
        );
      })}

      {seul && surPoignee && (
        <g transform={`translate(${seul.x} ${seul.y}) rotate(${seul.r})`}>
          <line x1={0} y1={-seul.p / 2} x2={0} y2={-seul.p / 2 - 45} stroke="#2980B9" strokeWidth={3} />
          <circle cx={0} cy={-seul.p / 2 - 55} r={18} fill="#ffffff" stroke="#2980B9" strokeWidth={4} onPointerDown={(ev) => surPoignee(ev, seul.id)} style={{ cursor: "grab" }} />
        </g>
      )}
    </svg>
  );
}
