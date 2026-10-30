import { db } from "@/lib/db";
import { anneeScolaireDebut } from "@/lib/fraisRecap";
import { ListeInventaire, type ArticleVue } from "@/components/inventaire/Inventaire";

// Inventaire du matériel de l'école, repris de l'inventaire des immobilisations du
// comptable et complété sur le terrain (lieu, état, n° de série, photos). Direction seule.
export default async function InventairePage() {
  const [articles, lieux] = await Promise.all([
    db.articleInventaire.findMany({
      include: {
        lieu: { select: { nom: true } },
        photos: { orderBy: { ajouteLe: "asc" }, select: { id: true, url: true } },
      },
      orderBy: [{ numeroImmo: { sort: "asc", nulls: "last" } }, { designation: "asc" }],
    }),
    db.lieuPresence.findMany({ where: { actif: true }, orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
  ]);

  const vues: ArticleVue[] = articles.map((a) => ({
    id: a.id,
    numeroImmo: a.numeroImmo,
    designation: a.designation,
    categorie: a.categorie,
    marqueModele: a.marqueModele,
    numeroSerie: a.numeroSerie,
    dateAcquisition: a.dateAcquisition?.toISOString().slice(0, 10) ?? null,
    valeurCentimes: a.valeurCentimes,
    lieuId: a.lieuId,
    lieuNom: a.lieu?.nom ?? null,
    localisation: a.localisation,
    etat: a.etat,
    remarques: a.remarques,
    verifieLe: a.verifieLe?.toISOString() ?? null,
    dossierDriveUrl: a.dossierDriveUrl,
    photos: a.photos,
  }));
  const debut = new Date(Date.UTC(anneeScolaireDebut(new Date()), 8, 1)).toISOString();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Inventaire du matériel</h1>
        <p className="text-sm text-slate-500">
          Une photo lève le doute quand il n&apos;y a qu&apos;une référence ou pas de numéro de série. « Vu aujourd&apos;hui »
          note la date du dernier contrôle.
        </p>
      </div>
      <ListeInventaire articles={vues} lieux={lieux} debutAnneeScolaire={debut} />
    </div>
  );
}
