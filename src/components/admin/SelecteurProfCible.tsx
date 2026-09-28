"use client";

interface Prof {
  id: string;
  nom: string;
  prenom: string;
}

export function SelecteurProfCible({
  profs,
  profIdActuel,
  moiId,
}: {
  profs: Prof[];
  profIdActuel: string;
  moiId: string;
}) {
  return (
    <form method="GET" className="flex items-center gap-2 text-sm">
      <label htmlFor="profId" className="text-slate-500">
        Gérer pour :
      </label>
      <select
        id="profId"
        name="profId"
        defaultValue={profIdActuel}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
      >
        <option value={moiId}>Moi-même</option>
        {profs
          .filter((p) => p.id !== moiId)
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.prenom} {p.nom}
            </option>
          ))}
      </select>
    </form>
  );
}
