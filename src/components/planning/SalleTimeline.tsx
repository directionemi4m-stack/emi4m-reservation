const JOUR_ENUM_PAR_INDEX = [
  "DIMANCHE",
  "LUNDI",
  "MARDI",
  "MERCREDI",
  "JEUDI",
  "VENDREDI",
  "SAMEDI",
] as const;

const LIBELLE_JOUR_COURT: Record<string, string> = {
  LUNDI: "Lun",
  MARDI: "Mar",
  MERCREDI: "Mer",
  JEUDI: "Jeu",
  VENDREDI: "Ven",
  SAMEDI: "Sam",
  DIMANCHE: "Dim",
};

interface Bloc {
  heureDebut: Date;
  heureFin: Date;
  label: string;
  variante: "recurrent" | "validee";
}

interface CreneauRecurrentInput {
  jourSemaine: string;
  heureDebut: Date;
  heureFin: Date;
  dateDebut: Date;
  dateFin: Date | null;
}

interface ReservationValideeInput {
  date: Date;
  heureDebut: Date;
  heureFin: Date;
  demande: { prof: { nom: string; prenom: string } };
}

interface Props {
  salle: { id: string; nom: string; commune: { nom: string } };
  jours: Date[];
  creneauxRecurrents: CreneauRecurrentInput[];
  reservationsValidees: ReservationValideeInput[];
  heureMinAxe: number;
  heureMaxAxe: number;
}

function memeJour(a: Date, b: Date) {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

function heureDecimale(date: Date) {
  return date.getUTCHours() + date.getUTCMinutes() / 60;
}

function formatterHeure(date: Date) {
  return date.toISOString().slice(11, 16);
}

export function SalleTimeline({
  salle,
  jours,
  creneauxRecurrents,
  reservationsValidees,
  heureMinAxe,
  heureMaxAxe,
}: Props) {
  const amplitude = heureMaxAxe - heureMinAxe;

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-brand-slate">
        {salle.commune.nom} — {salle.nom}
      </p>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
      <div className="grid grid-cols-7 gap-2" style={{ minWidth: "560px" }}>
        {jours.map((jour) => {
          const jourEnum = JOUR_ENUM_PAR_INDEX[jour.getUTCDay()];
          const blocs: Bloc[] = [
            ...creneauxRecurrents
              .filter(
                (c) =>
                  c.jourSemaine === jourEnum &&
                  c.dateDebut <= jour &&
                  (!c.dateFin || c.dateFin >= jour)
              )
              .map((c) => ({
                heureDebut: c.heureDebut,
                heureFin: c.heureFin,
                label: "Cours récurrent",
                variante: "recurrent" as const,
              })),
            ...reservationsValidees
              .filter((r) => memeJour(r.date, jour))
              .map((r) => ({
                heureDebut: r.heureDebut,
                heureFin: r.heureFin,
                label: `${r.demande.prof.prenom} ${r.demande.prof.nom}`,
                variante: "validee" as const,
              })),
          ].sort((a, b) => a.heureDebut.getTime() - b.heureDebut.getTime());

          return (
            <div key={jour.toISOString()} className="flex flex-col gap-1">
              <div className="text-center text-xs font-medium text-slate-500">
                {LIBELLE_JOUR_COURT[jourEnum]} {jour.getUTCDate()}
              </div>
              <div className="relative h-40 overflow-hidden rounded-md bg-status-dispo/10">
                {blocs.length === 0 && (
                  <span className="absolute inset-0 flex items-center justify-center text-center text-[10px] text-status-dispo">
                    Disponible
                  </span>
                )}
                {blocs.map((b, i) => {
                  const top = ((heureDecimale(b.heureDebut) - heureMinAxe) / amplitude) * 100;
                  const hauteur =
                    ((heureDecimale(b.heureFin) - heureDecimale(b.heureDebut)) / amplitude) * 100;
                  return (
                    <div
                      key={i}
                      title={`${b.label} · ${formatterHeure(b.heureDebut)}–${formatterHeure(b.heureFin)}`}
                      className={
                        "absolute inset-x-0.5 overflow-hidden rounded px-1 text-[10px] leading-tight text-white " +
                        (b.variante === "recurrent" ? "bg-brand-slate" : "bg-status-occupee")
                      }
                      style={{ top: `${top}%`, height: `${Math.max(hauteur, 4)}%` }}
                    >
                      {formatterHeure(b.heureDebut)}–{formatterHeure(b.heureFin)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-400">
        <span>{heureMinAxe}h</span>
        <span>{heureMaxAxe}h</span>
      </div>
    </div>
  );
}
