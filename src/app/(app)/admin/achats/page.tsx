import { db } from "@/lib/db";
import { AjoutFacture } from "@/components/achats/AjoutFacture";
import { ListeFactures } from "@/components/achats/ListeFactures";

// Achats du quotidien : chaque facture est archivée en PDF dans le Drive, nommée
// « AAAA-MM-JJ_Entreprise.pdf » après validation, et peut être rattachée à des biens de
// l'inventaire. Réservé à la direction (cf. admin/layout.tsx).
export default async function AchatsPage() {
  const [factures, articles] = await Promise.all([
    db.facture.findMany({ orderBy: [{ date: "desc" }, { ajouteLe: "desc" }], include: { articles: { select: { id: true } } } }),
    db.articleInventaire.findMany({
      where: { etat: { not: "SORTI" } },
      orderBy: [{ numeroImmo: { sort: "asc", nulls: "last" } }, { designation: "asc" }],
      select: { id: true, numeroImmo: true, designation: true },
    }),
  ]);

  const biens = articles.map((a) => ({ id: a.id, libelle: a.numeroImmo !== null ? `N°${a.numeroImmo} · ${a.designation}` : a.designation }));
  const fournisseurs = [...new Set(factures.map((f) => f.fournisseur))].sort((a, b) => a.localeCompare(b, "fr"));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Achats et factures</h1>
        <p className="text-sm text-slate-500">
          Ajoutez la facture en PDF ou photographiez-la : Claude lit la date, l&apos;entreprise, le montant et l&apos;objet, et
          le nom « année-mois-jour_entreprise » est proposé. Vous vérifiez avant d&apos;archiver.
        </p>
      </div>

      <section className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-slate">Nouvelle facture</h2>
        <AjoutFacture biens={biens} fournisseurs={fournisseurs} />
      </section>

      <ListeFactures
        biens={biens}
        factures={factures.map((f) => ({
          id: f.id,
          date: f.date.toISOString().slice(0, 10),
          fournisseur: f.fournisseur,
          montantCentimes: f.montantCentimes,
          objet: f.objet,
          nomFichier: f.nomFichier,
          url: f.url,
          articleIds: f.articles.map((a) => a.id),
        }))}
      />
    </div>
  );
}
