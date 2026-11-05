import { lireCoordonnees } from "@/lib/coordonneesServeur";
import { CoordonneesForm } from "@/components/admin/CoordonneesForm";

// Coordonnées de l'école, reprises sur les documents officiels (relevé SACEM…). Réservé à
// la direction (cf. admin/layout.tsx).
export default async function CoordonneesEcolePage() {
  const coordonnees = await lireCoordonnees();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Coordonnées de l&apos;école</h1>
        <p className="text-sm text-slate-500">
          Reprises en en-tête des documents officiels, comme le relevé des programmes pour la SACEM.
        </p>
      </div>
      {!coordonnees.enregistrees && (
        <p className="rounded-lg border border-status-attente/40 bg-status-attente/10 p-3 text-sm text-slate-700">
          Valeurs proposées d&apos;après l&apos;appli (adresse de Villard, téléphone de la direction, mail info) : vérifiez-les,
          complétez le SIRET et le numéro SACEM, puis enregistrez.
        </p>
      )}
      <CoordonneesForm coordonnees={coordonnees} />
    </div>
  );
}
