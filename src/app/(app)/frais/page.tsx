import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AjouterTrajetForm } from "@/components/frais/AjouterTrajetForm";
import { SupprimerTrajetBouton } from "@/components/frais/SupprimerTrajetBouton";

function formatterDate(date: Date) {
  return date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

function cleMois(date: Date) {
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export default async function FraisPage() {
  const session = await auth();

  const [typesTrajet, trajets] = await Promise.all([
    db.typeTrajet.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }),
    db.trajet.findMany({
      where: { profId: session!.user.id },
      orderBy: { date: "desc" },
    }),
  ]);

  const groupes = new Map<string, typeof trajets>();
  for (const trajet of trajets) {
    const cle = cleMois(trajet.date);
    const liste = groupes.get(cle) ?? [];
    liste.push(trajet);
    groupes.set(cle, liste);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-semibold text-brand-slate">Mes frais de déplacement</h1>

      <AjouterTrajetForm typesTrajet={typesTrajet} />

      {trajets.length === 0 && (
        <p className="text-sm text-slate-500">Aucun trajet déclaré pour l&apos;instant.</p>
      )}

      {Array.from(groupes.entries()).map(([mois, lignes]) => {
        const totalKm = lignes.reduce((s, l) => s + l.km, 0);
        const totalPrix = lignes.reduce((s, l) => s + l.prix, 0);
        return (
          <div key={mois} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold capitalize text-brand-slate">{mois}</h2>
              <p className="text-xs text-slate-500">
                {totalKm} km · {totalPrix.toFixed(2)} €
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {lignes.map((trajet) => (
                <div
                  key={trajet.id}
                  className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {formatterDate(trajet.date)} · {trajet.mission}
                    </p>
                    <p className="text-xs text-slate-500">
                      {trajet.trajetNom} — {trajet.km} km · {trajet.prix.toFixed(2)} €
                    </p>
                  </div>
                  <SupprimerTrajetBouton id={trajet.id} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
