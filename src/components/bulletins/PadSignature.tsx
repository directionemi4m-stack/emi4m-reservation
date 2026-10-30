"use client";

import { useEffect, useRef, useState } from "react";

// Cadre où l'on signe au doigt (téléphone, tablette) ou à la souris. L'image est gardée en
// PNG transparent à une résolution fixe, quelle que soit la taille de l'écran, et passée au
// formulaire par un champ caché. Peut démarrer avec la dernière signature enregistrée.
const LARGEUR = 900;
const HAUTEUR = 300;

export function PadSignature({
  nom,
  initiale,
  desactive = false,
}: {
  nom: string;
  initiale?: string | null;
  desactive?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const enTrait = useRef(false);
  const [valeur, setValeur] = useState(initiale ?? "");

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !initiale) return;
    const image = new Image();
    image.onload = () => {
      ctx.clearRect(0, 0, LARGEUR, HAUTEUR);
      ctx.drawImage(image, 0, 0, LARGEUR, HAUTEUR);
    };
    image.src = initiale;
  }, [initiale]);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * LARGEUR) / r.width, y: ((e.clientY - r.top) * HAUTEUR) / r.height };
  }

  function debut(e: React.PointerEvent<HTMLCanvasElement>) {
    if (desactive) return;
    const ctx = e.currentTarget.getContext("2d")!;
    e.currentTarget.setPointerCapture(e.pointerId);
    enTrait.current = true;
    const { x, y } = point(e);
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e293b";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  }

  function trait(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!enTrait.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const { x, y } = point(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function fin(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!enTrait.current) return;
    enTrait.current = false;
    setValeur(e.currentTarget.toDataURL("image/png"));
  }

  function effacer() {
    canvasRef.current?.getContext("2d")?.clearRect(0, 0, LARGEUR, HAUTEUR);
    setValeur("");
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={LARGEUR}
          height={HAUTEUR}
          onPointerDown={debut}
          onPointerMove={trait}
          onPointerUp={fin}
          onPointerCancel={fin}
          aria-label="Cadre de signature"
          className={`aspect-[3/1] w-full max-w-md touch-none rounded-md border-2 border-dashed bg-white ${
            desactive ? "cursor-not-allowed border-slate-200 opacity-60" : "cursor-crosshair border-slate-300"
          }`}
        />
        {!valeur && !desactive && (
          <span className="pointer-events-none absolute left-3 top-2 text-xs text-slate-400">Signez ici</span>
        )}
      </div>
      <input type="hidden" name={nom} value={valeur} />
      {!desactive && (
        <button type="button" onClick={effacer} className="w-fit text-xs text-slate-500 underline hover:text-brand-slate">
          Effacer la signature
        </button>
      )}
    </div>
  );
}
