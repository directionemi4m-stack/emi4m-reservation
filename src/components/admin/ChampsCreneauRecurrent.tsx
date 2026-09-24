const JOURS = [
  { valeur: "LUNDI", label: "Lundi" },
  { valeur: "MARDI", label: "Mardi" },
  { valeur: "MERCREDI", label: "Mercredi" },
  { valeur: "JEUDI", label: "Jeudi" },
  { valeur: "VENDREDI", label: "Vendredi" },
  { valeur: "SAMEDI", label: "Samedi" },
  { valeur: "DIMANCHE", label: "Dimanche" },
];

export interface ProfChoix {
  id: string;
  nom: string;
  prenom: string;
}

export interface SalleChoix {
  id: string;
  nom: string;
  commune: { nom: string };
}

export interface ValeursCreneauRecurrent {
  profId: string;
  salleId: string;
  jourSemaine: string;
  heureDebut: string; // HH:mm
  heureFin: string; // HH:mm
  dateDebut: string; // YYYY-MM-DD
  dateFin: string; // YYYY-MM-DD ou ""
}

const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

// Champs du formulaire d'un créneau récurrent, partagés par l'ajout (valeurs vides,
// début = aujourd'hui) et la modification (valeurs du créneau existant).
export function ChampsCreneauRecurrent({
  profs,
  salles,
  valeurs,
}: {
  profs: ProfChoix[];
  salles: SalleChoix[];
  valeurs?: ValeursCreneauRecurrent;
}) {
  const groupes = new Map<string, SalleChoix[]>();
  for (const s of salles) {
    const liste = groupes.get(s.commune.nom) ?? [];
    liste.push(s);
    groupes.set(s.commune.nom, liste);
  }

  const aujourdHui = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <select name="profId" required defaultValue={valeurs?.profId ?? ""} className={champClass}>
        <option value="" disabled>
          Prof…
        </option>
        {profs.map((p) => (
          <option key={p.id} value={p.id}>
            {p.prenom} {p.nom}
          </option>
        ))}
      </select>
      <select name="salleId" required defaultValue={valeurs?.salleId ?? ""} className={champClass}>
        <option value="" disabled>
          Salle…
        </option>
        {Array.from(groupes.entries()).map(([commune, sallesCommune]) => (
          <optgroup key={commune} label={commune}>
            {sallesCommune.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <select
        name="jourSemaine"
        required
        defaultValue={valeurs?.jourSemaine ?? ""}
        className={champClass}
      >
        <option value="" disabled>
          Jour…
        </option>
        {JOURS.map((j) => (
          <option key={j.valeur} value={j.valeur}>
            {j.label}
          </option>
        ))}
      </select>
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        Heure de début
        <input
          type="time"
          name="heureDebut"
          required
          defaultValue={valeurs?.heureDebut}
          className={champClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        Heure de fin
        <input
          type="time"
          name="heureFin"
          required
          defaultValue={valeurs?.heureFin}
          className={champClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        Valide à partir du
        <input
          type="date"
          name="dateDebut"
          required
          defaultValue={valeurs?.dateDebut ?? aujourdHui}
          className={champClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-500 sm:col-span-3">
        Jusqu&apos;au (optionnel)
        <input
          type="date"
          name="dateFin"
          defaultValue={valeurs?.dateFin ?? ""}
          className={`${champClass} sm:w-48`}
        />
      </label>
    </div>
  );
}
