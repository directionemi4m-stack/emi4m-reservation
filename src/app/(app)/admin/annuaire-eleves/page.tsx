import Link from "next/link";
import { db } from "@/lib/db";
import { ImportEleves } from "@/components/annuaire/ImportEleves";

// Import annuel du fichier Excel des inscriptions dans l'annuaire des élèves. Réservé à
// la direction (cf. admin/layout.tsx). Le fichier est lu par l'appli elle-même ; il n'est
// conservé nulle part, seules les informations retenues sont enregistrées.
export default async function ImportAnnuaireElevesPage() {
  const [dernier, nbActuel, communes] = await Promise.all([
    db.importAnnuaireEleves.findFirst({ orderBy: { importeLe: "desc" } }),
    db.eleveAnnuaire.count(),
    db.commune.findMany({ select: { nom: true }, orderBy: { nom: "asc" } }),
  ]);

  const precedente =
    dernier?.correspondance && typeof dernier.correspondance === "object" && !Array.isArray(dernier.correspondance)
      ? (Object.fromEntries(Object.entries(dernier.correspondance).filter(([, v]) => typeof v === "string")) as Record<string, string>)
      : {};

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Importer l&apos;annuaire des élèves</h1>
        <p className="text-sm text-slate-500">
          Chaque année, déposez ici le fichier Excel des inscriptions : l&apos;appli en retire le nom, le prénom,
          l&apos;instrument, les mails, les téléphones et la commune de chaque élève, et remplace l&apos;annuaire précédent.
          Les autres colonnes ne sont pas enregistrées.
        </p>
      </div>

      <p className="rounded-lg bg-white p-3 text-sm text-slate-600 shadow-sm">
        {dernier ? (
          <>
            Annuaire actuel : <strong>{nbActuel} élèves</strong>, importés le{" "}
            {dernier.importeLe.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" })} depuis «{" "}
            {dernier.nomFichier} ».{" "}
            <Link href="/annuaire/eleves" className="text-brand-accent hover:underline">
              Voir l&apos;annuaire
            </Link>
          </>
        ) : (
          "L'annuaire des élèves est encore vide."
        )}
      </p>

      <ImportEleves communes={communes.map((c) => c.nom)} correspondancePrecedente={precedente} nbActuel={nbActuel} />
    </div>
  );
}
