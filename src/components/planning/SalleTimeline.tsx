import Link from "next/link";
import {
  LIBELLE_JOUR_COURT,
  disposerBlocs,
  formatterHeure,
  heureDecimale,
  jourEnum,
  versParamDate,
  type BlocOccupation,
} from "@/lib/planning";

interface Props {
  salle: { id: string; nom: string; commune: { nom: string } };
  jours: Date[];
  blocs: BlocOccupation[]; // occupations de CETTE salle sur la semaine
  heureMinAxe: number;
  heureMaxAxe: number;
  semaine: string; // lundi de la semaine affichée (YYYY-MM-DD), pour les liens de retour
  taille?: "compact" | "large";
}

// Hauteur (px) de la colonne d'un jour : petite sur le planning général, grande pour le zoom.
const HAUTEUR_PX = { compact: 208, large: 640 } as const;

export function SalleTimeline({
  salle,
  jours,
  blocs,
  heureMinAxe,
  heureMaxAxe,
  semaine,
  taille = "compact",
}: Props) {
  const amplitude = heureMaxAxe - heureMinAxe;
  const hauteurColonne = HAUTEUR_PX[taille];
  const grand = taille === "large";
  const heures = Array.from({ length: amplitude + 1 }, (_, i) => heureMinAxe + i);

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      {!grand && (
        <Link
          href={`/planning/salle/${salle.id}?semaine=${semaine}`}
          className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-slate hover:text-brand-accent hover:underline"
          title="Voir le détail de la semaine pour cette salle"
        >
          {salle.commune.nom} — {salle.nom}
          <span aria-hidden className="text-xs">↗</span>
        </Link>
      )}

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: grand
              ? "2rem repeat(7, minmax(112px, 1fr))"
              : "repeat(7, minmax(0, 1fr))",
            minWidth: grand ? "860px" : "560px",
          }}
        >
          {grand && (
            <div className="flex flex-col gap-1">
              <div className="h-4" />
              <div className="relative" style={{ height: hauteurColonne }}>
                {heures.map((h) => (
                  <span
                    key={h}
                    className="absolute right-0 -translate-y-1/2 text-[10px] text-slate-400"
                    style={{ top: `${((h - heureMinAxe) / amplitude) * 100}%` }}
                  >
                    {h}h
                  </span>
                ))}
              </div>
            </div>
          )}

          {jours.map((jour) => {
            const nomJour = jourEnum(jour);
            const jourParam = versParamDate(jour);
            const blocsDuJour = disposerBlocs(blocs.filter((b) => b.jour === jourParam));

            return (
              <Link
                key={jourParam}
                href={`/planning/salle/${salle.id}/${jourParam}?semaine=${semaine}`}
                className="group flex flex-col gap-1"
                title="Voir le détail de cette journée"
              >
                <div className="text-center text-xs font-medium text-slate-500 group-hover:text-brand-accent group-hover:underline">
                  {LIBELLE_JOUR_COURT[nomJour]} {jour.getUTCDate()}
                </div>
                <div
                  className="relative overflow-hidden rounded-md bg-status-dispo/10 ring-brand-accent/40 group-hover:ring-2"
                  style={{ height: hauteurColonne }}
                >
                  {grand &&
                    heures.slice(1, -1).map((h) => (
                      <div
                        key={h}
                        className="absolute inset-x-0 border-t border-white/70"
                        style={{ top: `${((h - heureMinAxe) / amplitude) * 100}%` }}
                      />
                    ))}
                  {blocsDuJour.length === 0 && (
                    <span className="absolute inset-0 flex items-center justify-center text-center text-[10px] text-status-dispo">
                      Disponible
                    </span>
                  )}
                  {blocsDuJour.map((b) => {
                    const debut = heureDecimale(b.heureDebut);
                    const fin = heureDecimale(b.heureFin);
                    const top = ((debut - heureMinAxe) / amplitude) * 100;
                    const hauteur = Math.max(((fin - debut) / amplitude) * 100, 4);
                    const hauteurPx = (hauteur / 100) * hauteurColonne;
                    const horaire = `${formatterHeure(b.heureDebut)}–${formatterHeure(b.heureFin)}`;

                    return (
                      <div
                        key={`${b.type}-${b.id}`}
                        title={`${b.personne} · ${horaire} · ${b.type === "recurrent" ? "Cours récurrent" : "Réservation validée"}`}
                        className={
                          "absolute overflow-hidden rounded px-1 leading-tight text-white " +
                          (grand ? "text-xs " : "text-[10px] ") +
                          (b.type === "recurrent" ? "bg-brand-slate" : "bg-status-occupee")
                        }
                        style={{
                          top: `${top}%`,
                          height: `${hauteur}%`,
                          left: `calc(${(b.colonne / b.nbColonnes) * 100}% + 2px)`,
                          width: `calc(${100 / b.nbColonnes}% - 4px)`,
                        }}
                      >
                        {hauteurPx >= (grand ? 36 : 30) ? (
                          <>
                            <span className="block truncate font-semibold">{b.personne}</span>
                            <span className="block truncate opacity-80">{horaire}</span>
                          </>
                        ) : hauteurPx >= 13 ? (
                          <span className="block truncate font-semibold">{b.personne}</span>
                        ) : null /* trop petit pour du texte lisible : le zoom donne le détail */}
                      </div>
                    );
                  })}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {!grand && (
        <div className="mt-2 flex justify-between text-[10px] text-slate-400">
          <span>{heureMinAxe}h</span>
          <span>{heureMaxAxe}h</span>
        </div>
      )}
    </div>
  );
}
