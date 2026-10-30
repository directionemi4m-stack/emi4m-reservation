import { db } from "@/lib/db";
import { formaterDuree, volumeHebdoMinutes } from "@/lib/agenda";
import { dureeEnMinutes } from "@/lib/activiteAccessoire";
import { ajouterJours, lundiDe } from "@/lib/planning";
import { libelleTypeEvenement } from "@/lib/saison";
import { campagneOuverte, periodeCourante } from "@/lib/bulletinsCham";

export interface EtatTuile {
  statut?: string;
  pastille?: number; // quelque chose à traiter
}

const jourCourt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const moisCourt = (d: Date) => d.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" });
const euros = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

function aujourdHuiUTC() {
  const m = new Date();
  return new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate()));
}

const CHAMPS_FICHE = [
  "adresseDomicile",
  "numeroPermis",
  "numeroCarteGrise",
  "numeroAssuranceAuto",
  "immatriculationVehicule",
  "marqueModeleVehicule",
  "puissanceFiscale",
] as const;

// La ligne d'état de chaque tuile de la page d'accueil, indexée par l'adresse de la page.
// Toutes les requêtes partent en même temps ; une tuile sans état reste simplement sans
// sous-titre.
export async function etatsAccueil(userId: string, estAdmin: boolean): Promise<Record<string, EtatTuile>> {
  const aujourdHui = aujourdHuiUTC();
  const finSemaine = ajouterJours(lundiDe(aujourdHui), 7);
  const debutMois = new Date(Date.UTC(aujourdHui.getUTCFullYear(), aujourdHui.getUTCMonth(), 1));
  const finMois = new Date(Date.UTC(aujourdHui.getUTCFullYear(), aujourdHui.getUTCMonth() + 1, 1));
  const periodeBulletins = periodeCourante(aujourdHui);

  const [
    reservations,
    demandesEnAttente,
    prochaineSeance,
    creneaux,
    trajets,
    activites,
    identite,
    prochainEvenement,
    nbCham,
    nbCollegues,
    codeAlarme,
    aTraiter,
    invitations,
    suivisCham,
    bulletinsSignes,
  ] = await Promise.all([
    db.demandeCreneau.count({
      where: { statut: "VALIDEE", date: { gte: aujourdHui, lt: finSemaine }, demande: { profId: userId } },
    }),
    db.demandeCreneau.count({ where: { statut: "EN_ATTENTE", demande: { profId: userId } } }),
    db.seance.findFirst({
      where: { date: { gte: aujourdHui }, classe: { profId: userId, actif: true } },
      orderBy: { date: "asc" },
      include: { classe: { select: { nom: true } } },
    }),
    db.creneauAgenda.findMany({ where: { profId: userId }, select: { dureeMinutes: true, uneSemaineSurDeux: true } }),
    db.trajet.findMany({
      where: { profId: userId, supprimeLe: null, date: { gte: debutMois, lt: finMois } },
      select: { prix: true },
    }),
    db.activiteAccessoire.findMany({
      where: { profId: userId, supprimeLe: null, date: { gte: debutMois, lt: finMois } },
      select: { duree: true },
    }),
    db.identiteProf.findUnique({ where: { profId: userId } }),
    db.evenementSaison.findFirst({ where: { date: { gte: aujourdHui } }, orderBy: [{ date: "asc" }, { heureDebutMinutes: "asc" }] }),
    db.eleveCham.count(),
    db.user.count({ where: { actif: true, id: { not: userId } } }),
    db.codeAlarme.findUnique({ where: { userId }, select: { id: true } }),
    estAdmin ? db.demandeCreneau.count({ where: { statut: "EN_ATTENTE" } }) : Promise.resolve(0),
    estAdmin ? db.user.count({ where: { actif: true, motDePasseHash: null } }) : Promise.resolve(0),
    db.suiviCham.count({ where: { profId: userId } }),
    db.appreciationCham.count({ where: { profId: userId, ...periodeBulletins } }),
  ]);

  const ficheManquante = CHAMPS_FICHE.filter((c) => !identite?.[c]).length;
  const minutesActivite = activites.reduce((s, a) => s + dureeEnMinutes(a.duree), 0);
  const volume = volumeHebdoMinutes(creneaux);
  const bulletinsRestants = Math.max(0, suivisCham - bulletinsSignes);
  const campagne = campagneOuverte(aujourdHui, periodeBulletins.anneeDebut, periodeBulletins.trimestre);

  return {
    "/planning": { statut: reservations ? `${pluriel(reservations, "réservation")} cette sem.` : "Voir les salles" },
    "/demandes": {
      statut: demandesEnAttente ? `${demandesEnAttente} en attente` : "Aucune en attente",
      pastille: demandesEnAttente || undefined,
    },
    "/presences": {
      statut: prochaineSeance
        ? `${prochaineSeance.classe.nom} · ${
            prochaineSeance.date.getTime() === aujourdHui.getTime() ? "aujourd'hui" : jourCourt(prochaineSeance.date)
          }`
        : "Aucune séance prévue",
    },
    "/agenda": { statut: creneaux.length ? `${formaterDuree(volume)} / sem.` : "À remplir" },
    "/frais": {
      statut: trajets.length
        ? `${moisCourt(aujourdHui)} : ${euros(trajets.reduce((s, t) => s + t.prix, 0))}`
        : "Rien ce mois-ci",
    },
    "/activite-accessoire": { statut: minutesActivite ? `${formaterDuree(minutesActivite)} ce mois` : "Rien ce mois-ci" },
    "/frais/identite": {
      statut: ficheManquante === 0 ? "Complète" : `${pluriel(ficheManquante, "info")} à compléter`,
    },
    "/saison": {
      statut: prochainEvenement
        ? `${libelleTypeEvenement(prochainEvenement.type)} · ${jourCourt(prochainEvenement.date)}`
        : "Aucun événement à venir",
    },
    "/cham": { statut: pluriel(nbCham, "élève") },
    "/bulletins-cham": {
      statut:
        suivisCham === 0
          ? "Ajouter mes élèves"
          : bulletinsRestants === 0
            ? `T${periodeBulletins.trimestre} : tout est signé`
            : `T${periodeBulletins.trimestre} : ${bulletinsRestants} à signer`,
      pastille: campagne && bulletinsRestants ? bulletinsRestants : undefined,
    },
    "/annuaire": { statut: pluriel(nbCollegues, "collègue") },
    "/securite": { statut: codeAlarme ? "Code alarme Lans" : "Consignes Villard" },
    "/admin/demandes": { statut: aTraiter ? pluriel(aTraiter, "demande") : "Rien à traiter", pastille: aTraiter || undefined },
    "/admin/parametres/profs": { statut: invitations ? pluriel(invitations, "invitation") : "Comptes à jour" },
    "/admin/parametres": { statut: "Salles, trajets…" },
  };
}
