import Link from "next/link";
import { db } from "@/lib/db";
import { chargerDevis, clientsConnus } from "@/lib/devisServeur";
import { lireCoordonnees } from "@/lib/coordonneesServeur";
import { ajouterJours, CONDITIONS_DEFAUT, ECHEANCE_JOURS } from "@/lib/devis";
import { DocumentForm } from "@/components/devis/DocumentForm";

const aujourdHui = () => new Date(`${new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" })}T00:00:00.000Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);

// Nouvelle facture : reprise du devis accepté (lignes modifiables : heures réellement faites…),
// ou facture libre.
export default async function NouvelleFacturePage({ searchParams }: { searchParams: Promise<{ devis?: string }> }) {
  const { devis: devisId } = await searchParams;
  const [devis, rubriques, clients, coordonnees] = await Promise.all([
    devisId ? chargerDevis(devisId) : Promise.resolve(null),
    db.rubriquePrestation.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } }),
    clientsConnus(),
    lireCoordonnees(),
  ]);
  const date = aujourdHui();
  return (
    <div className="flex flex-col gap-3">
      <div>
        {devis && (
          <Link href={`/admin/devis/${devis.id}`} className="text-sm text-brand-accent hover:underline">
            ‹ Devis {devis.numero}
          </Link>
        )}
        <h2 className="mt-1 text-lg font-semibold text-brand-slate">{devis ? `Facture du devis ${devis.numero}` : "Nouvelle facture"}</h2>
        {devis && (
          <p className="text-sm text-slate-500">
            Tout est repris du devis. Ajustez si besoin (heures réellement faites, frais…) avant d&apos;émettre.
          </p>
        )}
        {devis && devis.factures.length > 0 && (
          <p className="mt-1 rounded-md bg-status-attente/10 p-2 text-xs text-slate-600">
            Ce devis a déjà été facturé ({devis.factures.map((f) => f.numero).join(", ")}). Une nouvelle facture s&apos;ajoutera (acompte, solde…).
          </p>
        )}
      </div>
      <DocumentForm
        type="FACTURE"
        valeurs={{
          devisId: devis?.id,
          clientNom: devis?.clientNom ?? "",
          clientAdresse: devis?.clientAdresse ?? "",
          clientEmail: devis?.clientEmail ?? "",
          objet: devis?.objet ?? "",
          datePrestation: devis?.datePrestation ?? "",
          date: iso(date),
          echeance: iso(ajouterJours(date, ECHEANCE_JOURS)),
          conditions: devis?.conditions ?? "",
          lignes: devis?.lignes ?? [],
        }}
        rubriques={rubriques}
        clients={clients}
        conditionsParDefaut={coordonnees.conditionsPaiement || CONDITIONS_DEFAUT}
        annuler={devis ? `/admin/devis/${devis.id}` : "/admin/devis/factures"}
      />
    </div>
  );
}
