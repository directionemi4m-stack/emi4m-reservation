import Link from "next/link";
import { db } from "@/lib/db";

function bornesMoisEnCours() {
  const maintenant = new Date();
  const debut = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1));
  const fin = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() + 1, 1));
  return { debut, fin };
}

function Carte({
  titre,
  href,
  children,
}: {
  titre: string;
  href?: string;
  children: React.ReactNode;
}) {
  const contenu = (
    <div className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-brand-slate">{titre}</h2>
      {children}
    </div>
  );
  return href ? (
    <Link href={href} className="block transition hover:shadow-md">
      {contenu}
    </Link>
  ) : (
    contenu
  );
}

export default async function TableauDeBordPage() {
  const { debut, fin } = bornesMoisEnCours();

  const [demandesEnAttente, trajetsDuMois, activitesDuMois, invitationsEnAttente, comptesDesactives, impersonationsEnCours] =
    await Promise.all([
      db.demandeCreneau.count({ where: { statut: "EN_ATTENTE" } }),
      db.trajet.findMany({ where: { supprimeLe: null, date: { gte: debut, lt: fin } } }),
      db.activiteAccessoire.findMany({
        where: { supprimeLe: null, date: { gte: debut, lt: fin } },
      }),
      db.user.count({ where: { actif: true, motDePasseHash: null } }),
      db.user.count({ where: { actif: false } }),
      db.journalImpersonation.count({ where: { termineLe: null } }),
    ]);

  const totalKm = trajetsDuMois.reduce((s, t) => s + t.km, 0);
  const totalPrix = trajetsDuMois.reduce((s, t) => s + t.prix, 0);

  const parType = new Map<string, number>();
  for (const a of activitesDuMois) {
    parType.set(a.typeEvenementNom, (parType.get(a.typeEvenementNom) ?? 0) + 1);
  }

  const libelleMois = debut.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-brand-slate">Tableau de bord</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Carte titre="Demandes de salle en attente" href="/admin/demandes">
          <p className="text-3xl font-semibold text-brand-slate">{demandesEnAttente}</p>
          <p className="text-xs text-slate-500">à valider ou refuser</p>
        </Carte>

        <Carte titre={`Frais — ${libelleMois}`} href="/admin/parametres/profs">
          <p className="text-3xl font-semibold text-brand-slate">{totalPrix.toFixed(2)} €</p>
          <p className="text-xs text-slate-500">{totalKm} km · {trajetsDuMois.length} trajet(s), toutes profs confondues</p>
        </Carte>

        <Carte titre={`Activité accessoire — ${libelleMois}`}>
          <p className="text-3xl font-semibold text-brand-slate">{activitesDuMois.length}</p>
          {parType.size > 0 ? (
            <ul className="text-xs text-slate-500">
              {Array.from(parType.entries()).map(([nom, n]) => (
                <li key={nom}>
                  {nom} : {n}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">Aucune entrée ce mois-ci.</p>
          )}
        </Carte>

        <Carte titre="Comptes profs" href="/admin/parametres/profs">
          <p className="text-3xl font-semibold text-brand-slate">{invitationsEnAttente}</p>
          <p className="text-xs text-slate-500">
            invitation(s) en attente · {comptesDesactives} compte(s) désactivé(s)
          </p>
        </Carte>

        <Carte titre="Se connecter en tant que" href="/admin/parametres/journal-impersonation">
          <p className="text-3xl font-semibold text-brand-slate">{impersonationsEnCours}</p>
          <p className="text-xs text-slate-500">session(s) en cours</p>
        </Carte>
      </div>

      <p className="text-xs text-slate-400">
        Les alertes d&apos;absences répétées restent envoyées par email au prof concerné, pas
        reprises ici.
      </p>
    </div>
  );
}
