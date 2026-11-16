import { DessinPlan } from "@/components/plans/DessinPlan";
import { inventaire, metres, musiciens, texteChangements, texteInventaire, type ElementPlan } from "@/lib/plansScene";

// Une page imprimable : le plan à l'échelle, la liste des musiciens, le matériel à installer
// et, dans une conduite, ce qui change depuis le passage précédent.
export function FichePlan({
  numero,
  titre,
  sousTitre,
  largeur,
  profondeur,
  elements,
  notes,
  changements,
}: {
  numero?: number;
  titre: string;
  sousTitre?: string;
  largeur: number;
  profondeur: number;
  elements: ElementPlan[];
  notes: string | null;
  changements?: { nom: string; delta: number }[] | null;
}) {
  const stock = inventaire(elements);
  const places = elements.filter((e) => e.categorie === "MUSICIEN" && !e.fixe).sort((a, b) => a.y - b.y || a.x - b.x);
  return (
    <article className="flex break-after-page flex-col gap-2 rounded-lg bg-white p-4 shadow-sm print:rounded-none print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-300 pb-1">
        <h2 className="text-lg font-semibold text-brand-slate">
          {numero !== undefined && <span className="mr-2 text-slate-400">{numero}.</span>}
          {titre}
        </h2>
        <p className="text-xs text-slate-500">
          {sousTitre && `${sousTitre} · `}scène {metres(largeur)} × {metres(profondeur)} · {musiciens(elements)} musicien{musiciens(elements) > 1 ? "s" : ""}
        </p>
      </header>
      {changements && changements.length > 0 && (
        <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-900 print:border print:border-amber-300">
          <strong>Changement de plateau : </strong>
          {texteChangements(changements)}
        </p>
      )}
      {changements && changements.length === 0 && <p className="text-sm text-slate-500">Même matériel que le passage précédent (placement à vérifier sur le plan).</p>}
      <DessinPlan largeur={largeur} profondeur={profondeur} elements={elements} className="h-auto max-h-[62vh] w-full print:max-h-[150mm]" />
      <div className="grid gap-3 text-sm sm:grid-cols-2 print:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Musiciens</p>
          <p className="text-slate-700">{places.map((e) => `${e.label ?? "?"} (${e.nom.toLowerCase()})`).join(", ") || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Matériel sur le plateau</p>
          <p className="text-slate-700">{texteInventaire(stock) || "—"}</p>
        </div>
      </div>
      {notes && <p className="whitespace-pre-line text-sm text-slate-700">{notes}</p>}
    </article>
  );
}
