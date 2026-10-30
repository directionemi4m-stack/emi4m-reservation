import Link from "next/link";
import { db } from "@/lib/db";
import { anneeScolaireDebut } from "@/lib/fraisRecap";
import { cleEleve, libelleSaison } from "@/lib/locations";
import { BoutonReconduire, ListeAttente, ListeLocations, type LocationVue } from "@/components/locations/Locations";

// Suivi des locations d'instruments, saison par saison, avec l'historique de chaque élève
// et les documents rendus par les familles. Réservé à la direction (cf. admin/layout.tsx).
export default async function LocationsPage({ searchParams }: { searchParams: Promise<{ saison?: string }> }) {
  const courante = anneeScolaireDebut(new Date());
  const demandee = Number((await searchParams).saison);
  const anneeDebut = Number.isInteger(demandee) && demandee >= 2000 && demandee <= 2100 ? demandee : courante;

  const [locations, demandes, toutes, saisonsDemandes] = await Promise.all([
    db.locationInstrument.findMany({
      where: { anneeDebut },
      include: { documents: { orderBy: { ajouteLe: "asc" }, select: { id: true, nomFichier: true, url: true } } },
      orderBy: [{ instrument: "asc" }, { nom: "asc" }, { prenom: "asc" }],
    }),
    db.demandeLocation.findMany({ where: { anneeDebut }, orderBy: [{ instrument: "asc" }, { nom: "asc" }] }),
    db.locationInstrument.findMany({ select: { anneeDebut: true, prenom: true, nom: true, instrument: true } }),
    db.demandeLocation.findMany({ distinct: ["anneeDebut"], select: { anneeDebut: true } }),
  ]);

  // Saisons proposées : toutes celles qui ont des données, la saison en cours et la suivante.
  const saisons = [
    ...new Set([...toutes.map((l) => l.anneeDebut), ...saisonsDemandes.map((d) => d.anneeDebut), courante, courante + 1, anneeDebut]),
  ].sort((a, b) => b - a);

  // Historique : les autres saisons où le même élève a loué un instrument.
  const historiqueDe = (prenom: string, nom: string) =>
    toutes
      .filter((t) => t.anneeDebut !== anneeDebut && cleEleve(t.prenom, t.nom) === cleEleve(prenom, nom))
      .sort((a, b) => a.anneeDebut - b.anneeDebut)
      .map((t) => `${libelleSaison(t.anneeDebut)} · ${t.instrument}`);

  const vues: LocationVue[] = locations.map((l) => ({
    id: l.id,
    instrument: l.instrument,
    prenom: l.prenom,
    nom: l.nom,
    anneeLocation: l.anneeLocation,
    nbMois: l.nbMois,
    paye: l.paye,
    modePaiement: l.modePaiement,
    caution: l.caution,
    commentaire: l.commentaire,
    dossierDriveUrl: l.dossierDriveUrl,
    documents: l.documents,
    historique: historiqueDe(l.prenom, l.nom),
  }));
  const instruments = [...new Set(toutes.map((t) => t.instrument))].sort((a, b) => a.localeCompare(b, "fr"));
  const precedentes = toutes.filter((t) => t.anneeDebut === anneeDebut - 1).length;
  const payees = locations.filter((l) => l.paye).length;
  const cautionsAVoir = locations.filter((l) => l.caution === "MANQUANTE" || l.caution === null).length;
  const idClasseur = process.env.GOOGLE_SHEETS_LOCATIONS_ID;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Locations d&apos;instruments</h1>
        <p className="text-sm text-slate-500">
          {locations.length} location{locations.length > 1 ? "s" : ""} · {payees} payée{payees > 1 ? "s" : ""} ·{" "}
          {locations.length - payees} à encaisser · {cautionsAVoir} caution{cautionsAVoir > 1 ? "s" : ""} à voir
          {idClasseur && (
            <>
              {" · "}
              <a
                href={`https://docs.google.com/spreadsheets/d/${idClasseur}`}
                target="_blank"
                rel="noreferrer"
                className="text-brand-accent hover:underline"
              >
                Ouvrir le classeur
              </a>
            </>
          )}
        </p>
      </div>

      <nav className="flex flex-wrap gap-1" aria-label="Saison">
        {saisons.map((s) => (
          <Link
            key={s}
            href={`/admin/locations?saison=${s}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              s === anneeDebut ? "bg-brand-slate text-white" : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"
            }`}
          >
            {libelleSaison(s)}
          </Link>
        ))}
      </nav>

      {locations.length === 0 && precedentes > 0 && <BoutonReconduire anneeDebut={anneeDebut} nombre={precedentes} />}

      <ListeLocations anneeDebut={anneeDebut} locations={vues} instruments={instruments} />

      <ListeAttente
        anneeDebut={anneeDebut}
        demandes={demandes.map((d) => ({ id: d.id, instrument: d.instrument, prenom: d.prenom, nom: d.nom, commentaire: d.commentaire }))}
      />
    </div>
  );
}
