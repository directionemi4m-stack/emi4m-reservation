import Link from "next/link";
import { IconFileTypePdf } from "@tabler/icons-react";
import { lireCoordonnees } from "@/lib/coordonneesServeur";
import { saisonARentrer } from "@/lib/rentree";
import { evenementsSacem, lirePeriode } from "@/lib/sacemServeur";
import { libelleLieu, libelleTypeEvenement } from "@/lib/saison";

// Aujourd'hui à minuit UTC, pour repérer les représentations passées.
const debutDuJour = () => {
  const m = new Date();
  return new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate()));
};
const jour = (d: Date) => d.toISOString().slice(0, 10);
const dateCourte = (d: Date) => d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const champClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30";

// Relevé des programmes pour la SACEM : toutes les représentations d'une période avec les
// œuvres jouées, en PDF avec les coordonnées de l'école. Réservé à la direction.
export default async function SacemPage({ searchParams }: { searchParams: Promise<{ debut?: string; fin?: string }> }) {
  const p = await searchParams;
  const { debut, fin, finIncluse } = lirePeriode(p.debut, p.fin, saisonARentrer(new Date()));
  const [evenements, coordonnees] = await Promise.all([evenementsSacem(debut, fin), lireCoordonnees()]);
  const nbOeuvres = evenements.reduce((n, e) => n + e.inscriptions.reduce((m, i) => m + i.morceaux.length, 0), 0);
  const aujourdHui = debutDuJour();
  const sansProgramme = evenements.filter((e) => e.inscriptions.length === 0 && e.date < aujourdHui);
  const manquants = [!coordonnees.enregistrees && "coordonnées à vérifier", !coordonnees.siret && "SIRET", !coordonnees.numeroSacem && "numéro SACEM"].filter(
    Boolean
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Relevé des programmes (SACEM)</h1>
        <p className="text-sm text-slate-500">
          Toutes les représentations de la période (heures musicales, concerts, auditions, autres) avec les œuvres saisies par les
          profs : titre, compositeur, arrangeur, interprètes et durée. Seules les représentations dont le programme est saisi
          figurent dans le PDF ; les réunions et les examens n&apos;y sont jamais.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Du
          <input type="date" name="debut" defaultValue={jour(debut)} className={champClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Au
          <input type="date" name="fin" defaultValue={jour(finIncluse)} className={champClass} />
        </label>
        <button type="submit" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Afficher
        </button>
        <a
          href={`/api/sacem?debut=${jour(debut)}&fin=${jour(finIncluse)}`}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-accent px-3 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90"
        >
          <IconFileTypePdf size={16} aria-hidden />
          Télécharger le PDF
        </a>
      </form>

      {manquants.length > 0 && (
        <p className="rounded-lg border border-status-attente/40 bg-status-attente/10 p-3 text-sm text-slate-700">
          En-tête du PDF à compléter : {manquants.join(", ")}.{" "}
          <Link href="/admin/parametres/ecole" className="font-medium text-brand-accent hover:underline">
            Coordonnées de l&apos;école
          </Link>
        </p>
      )}

      <p className="text-sm text-slate-600">
        <strong>{evenements.length}</strong> représentation{evenements.length > 1 ? "s" : ""} · <strong>{nbOeuvres}</strong> œuvre
        {nbOeuvres > 1 ? "s" : ""} saisie{nbOeuvres > 1 ? "s" : ""}
        {sansProgramme.length > 0 && (
          <span className="text-status-attente">
            {" "}
            · {sansProgramme.length} représentation{sansProgramme.length > 1 ? "s" : ""} passée{sansProgramme.length > 1 ? "s" : ""} sans programme
          </span>
        )}
      </p>

      <ul className="flex flex-col divide-y divide-slate-100 rounded-lg bg-white shadow-sm">
        {evenements.map((e) => {
          const oeuvres = e.inscriptions.reduce((m, i) => m + i.morceaux.length, 0);
          const passe = e.date < aujourdHui;
          return (
            <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 py-3">
              <div className="min-w-0">
                <Link href={`/saison/${e.id}`} className="text-sm font-medium text-slate-800 hover:text-brand-accent hover:underline">
                  {dateCourte(e.date)} · {e.titre}
                </Link>
                <p className="text-xs text-slate-500">
                  {libelleTypeEvenement(e.type)} · {libelleLieu(e.lieu?.nom, e.lieuPrecis) || "Lieu à préciser"}
                </p>
              </div>
              <span className={`text-xs ${oeuvres ? "text-slate-600" : passe ? "text-status-attente" : "text-slate-400"}`}>
                {oeuvres
                  ? `${e.inscriptions.length} passage${e.inscriptions.length > 1 ? "s" : ""} · ${oeuvres} œuvre${oeuvres > 1 ? "s" : ""}`
                  : e.inscriptions.length
                    ? `${e.inscriptions.length} passage${e.inscriptions.length > 1 ? "s" : ""}, œuvres non détaillées`
                    : passe
                    ? "Programme non renseigné"
                    : "À venir, pas encore de programme"}
              </span>
            </li>
          );
        })}
        {evenements.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Aucune représentation sur cette période.</li>}
      </ul>
    </div>
  );
}
