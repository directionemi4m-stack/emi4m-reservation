import Link from "next/link";
import {
  disposerBlocs,
  formatterHeure,
  heureDecimale,
  plagesLibres,
  type BlocOccupation,
} from "@/lib/planning";

const PX_PAR_HEURE = 64;

const LIBELLE_TYPE = { recurrent: "Cours récurrent", reservation: "Réservation validée" } as const;
const STYLE_TYPE = { recurrent: "bg-brand-slate", reservation: "bg-status-occupee" } as const;

function lienModification(b: BlocOccupation) {
  return b.type === "recurrent"
    ? `/admin/parametres/creneaux-recurrents?modifier=${b.id}#creneau-${b.id}`
    : `/admin/demandes?modifier=${b.id}#ligne-${b.id}`;
}

// Détail lisible d'une salle sur une journée : frise verticale à grande échelle, puis
// liste des occupations (avec accès direct à la modification pour la direction).
export function JourDetail({
  blocs,
  heureMinAxe,
  heureMaxAxe,
  estAdmin,
}: {
  blocs: BlocOccupation[];
  heureMinAxe: number;
  heureMaxAxe: number;
  estAdmin: boolean;
}) {
  const amplitude = heureMaxAxe - heureMinAxe;
  const hauteurTotale = amplitude * PX_PAR_HEURE;
  const heures = Array.from({ length: amplitude + 1 }, (_, i) => heureMinAxe + i);
  const disposes = disposerBlocs(blocs);
  const libres = plagesLibres(blocs, heureMinAxe, heureMaxAxe);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="flex gap-2">
          <div className="relative w-10 shrink-0" style={{ height: hauteurTotale }}>
            {heures.map((h) => (
              <span
                key={h}
                className="absolute right-0 -translate-y-1/2 text-xs text-slate-400"
                style={{ top: h === heureMinAxe ? 6 : (h - heureMinAxe) * PX_PAR_HEURE }}
              >
                {h}h
              </span>
            ))}
          </div>

          <div
            className="relative flex-1 overflow-hidden rounded-md bg-status-dispo/10"
            style={{ height: hauteurTotale }}
          >
            {heures.slice(1, -1).map((h) => (
              <div
                key={h}
                className="absolute inset-x-0 border-t border-white/80"
                style={{ top: (h - heureMinAxe) * PX_PAR_HEURE }}
              />
            ))}

            {disposes.length === 0 && (
              <p className="absolute inset-0 flex items-center justify-center text-sm font-medium text-status-dispo">
                Salle disponible toute la journée
              </p>
            )}

            {disposes.map((b) => {
              const debut = heureDecimale(b.heureDebut);
              const fin = heureDecimale(b.heureFin);
              const hauteur = Math.max((fin - debut) * PX_PAR_HEURE, 24);
              const horaire = `${formatterHeure(b.heureDebut)}–${formatterHeure(b.heureFin)}`;
              return (
                <div
                  key={`${b.type}-${b.id}`}
                  className={`absolute overflow-hidden rounded-md px-3 text-white shadow-sm ${
                    hauteur >= 44 ? "py-1.5" : "flex items-center py-0"
                  } ${STYLE_TYPE[b.type]}`}
                  style={{
                    top: (debut - heureMinAxe) * PX_PAR_HEURE,
                    height: hauteur - 2,
                    left: `calc(${(b.colonne / b.nbColonnes) * 100}% + 3px)`,
                    width: `calc(${100 / b.nbColonnes}% - 6px)`,
                  }}
                >
                  {hauteur >= 44 ? (
                    <>
                      <p className="truncate text-base font-semibold">{b.personne}</p>
                      <p className="text-sm">{horaire}</p>
                      {hauteur >= 76 && (
                        <p className="truncate text-xs opacity-80">{LIBELLE_TYPE[b.type]}</p>
                      )}
                    </>
                  ) : (
                    <p className={`truncate font-semibold ${hauteur >= 32 ? "text-sm" : "text-xs"}`}>
                      {horaire} · {b.personne}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-slate">Occupation de la journée</h2>
        {blocs.length === 0 && <p className="text-sm text-slate-500">Aucune occupation.</p>}
        <ul className="flex flex-col divide-y divide-slate-100">
          {blocs.map((b) => (
            <li key={`${b.type}-${b.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              <span className="w-28 font-medium text-slate-700">
                {formatterHeure(b.heureDebut)}–{formatterHeure(b.heureFin)}
              </span>
              <span className="flex-1 text-slate-700">{b.personne}</span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className={`inline-block h-2.5 w-2.5 rounded-sm ${STYLE_TYPE[b.type]}`} />
                {LIBELLE_TYPE[b.type]}
              </span>
              {estAdmin && (
                <Link href={lienModification(b)} className="text-xs font-medium text-brand-accent hover:underline">
                  Modifier
                </Link>
              )}
            </li>
          ))}
        </ul>
        {libres.length > 0 && blocs.length > 0 && (
          <p className="border-t border-slate-100 pt-2 text-sm text-status-dispo">
            Libre : {libres.join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
