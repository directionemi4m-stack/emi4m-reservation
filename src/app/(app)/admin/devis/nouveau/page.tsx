import { db } from "@/lib/db";
import { clientsConnus } from "@/lib/devisServeur";
import { lireCoordonnees } from "@/lib/coordonneesServeur";
import { ajouterJours, CONDITIONS_DEFAUT, VALIDITE_JOURS } from "@/lib/devis";
import { DocumentForm } from "@/components/devis/DocumentForm";

const aujourdHui = () => new Date(`${new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" })}T00:00:00.000Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function NouveauDevisPage() {
  const [rubriques, clients, coordonnees] = await Promise.all([
    db.rubriquePrestation.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } }),
    clientsConnus(),
    lireCoordonnees(),
  ]);
  const date = aujourdHui();
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-brand-slate">Nouveau devis</h2>
      <DocumentForm
        type="DEVIS"
        valeurs={{
          clientNom: "",
          clientAdresse: "",
          clientEmail: "",
          objet: "",
          datePrestation: "",
          date: iso(date),
          echeance: iso(ajouterJours(date, VALIDITE_JOURS)),
          conditions: "",
          notes: "",
          lignes: [],
        }}
        rubriques={rubriques}
        clients={clients}
        conditionsParDefaut={coordonnees.conditionsPaiement || CONDITIONS_DEFAUT}
        annuler="/admin/devis"
      />
    </div>
  );
}
