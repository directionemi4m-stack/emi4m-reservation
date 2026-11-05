import { db } from "@/lib/db";
import { cleNomEleve } from "@/lib/annuaireEleves";
import { debutSaison, finSaison } from "@/lib/rentree";
import { libelleTypeEvenement } from "@/lib/saison";
import { communeOfficielle, formaterPourcentage, pourcentage, repartition, type SectionBilan } from "@/lib/bilan";

const LIBELLE_ABSENCE_PROF: Record<string, string> = { RATTRAPAGE: "À rattraper", ARRET_MALADIE: "Arrêt maladie" };

// Les chiffres de la saison (septembre → août), tirés des données de l'appli.
export async function calculerBilan(saison: number, maintenant = new Date()) {
  const debut = debutSaison(saison);
  const fin = finSaison(saison);
  const jusquA = maintenant < fin ? maintenant : fin;
  const periode = { gte: debut, lt: fin };

  const [annuaire, dernierImport, seances, evenements, reservations, conventions, locations, trajets] = await Promise.all([
    db.eleveAnnuaire.findMany({ select: { instruments: true, commune: true } }),
    db.importAnnuaireEleves.findFirst({ orderBy: { importeLe: "desc" }, select: { importeLe: true } }),
    db.seance.findMany({
      where: { date: { gte: debut, lt: jusquA } },
      select: {
        classeId: true,
        classe: { select: { type: true, profId: true, _count: { select: { eleves: { where: { actif: true } } } } } },
        pointage: { select: { marques: { select: { statut: true } } } },
        absenceProf: { select: { type: true } },
      },
    }),
    db.evenementSaison.findMany({
      where: { date: periode },
      select: { type: true, inscriptions: { select: { eleveNom: true } } },
    }),
    db.demandeCreneau.findMany({
      where: { statut: "VALIDEE", date: periode },
      select: { salle: { select: { nom: true, commune: { select: { nom: true } } } } },
    }),
    db.conventionSalle.count({ where: { date: periode, fichierUrl: { not: null } } }),
    db.locationInstrument.findMany({ where: { anneeDebut: saison }, select: { instrument: true, paye: true } }),
    db.trajet.findMany({ where: { supprimeLe: null, date: periode }, select: { km: true, prix: true } }),
  ]);

  // Cours : ceux qui ont eu au moins une séance dans la saison.
  const cours = new Map<string, (typeof seances)[number]["classe"]>();
  for (const s of seances) cours.set(s.classeId, s.classe);
  const listeCours = [...cours.values()];
  const tenues = seances.filter((s) => s.pointage).length;
  const absencesProf = seances.flatMap((s) => (s.absenceProf ? [s.absenceProf.type] : []));
  const marques = seances.flatMap((s) => s.pointage?.marques ?? []);
  const nb = (statut: string) => marques.filter((m) => m.statut === statut).length;
  const passages = evenements.flatMap((e) => e.inscriptions);
  const residences = annuaire.map((e) => communeOfficielle(e.commune));

  const sections: SectionBilan[] = [
    {
      titre: "Élèves",
      chiffres: [
        { libelle: "Élèves inscrits (annuaire)", nombre: annuaire.length },
        { libelle: "Communes de résidence", nombre: new Set(residences.filter((r) => r.ccmv !== null).map((r) => r.nom)).size },
      ],
      tableaux: [
        {
          titre: "Résidence",
          colonne: "Zone",
          lignes: repartition(
            residences.map((r) => (r.ccmv === null ? "Non renseignée" : r.ccmv ? "Communauté de communes du Massif du Vercors" : "Hors communauté de communes"))
          ),
        },
        { titre: "Élèves par commune", colonne: "Commune", lignes: repartition(residences.map((r) => r.nom)) },
        {
          titre: "Élèves par instrument",
          colonne: "Instrument",
          lignes: repartition(annuaire.flatMap((e) => (e.instruments.length ? e.instruments : ["Sans instrument (FM, chorale…)"]))),
        },
      ],
      note: dernierImport
        ? `D'après l'annuaire importé le ${dernierImport.importeLe.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" })}. Un élève qui joue deux instruments compte dans les deux.`
        : "L'annuaire des élèves n'a pas encore été importé.",
    },
    {
      titre: "Cours et présences",
      chiffres: [
        { libelle: "Cours d'instrument", nombre: listeCours.filter((c) => c.type === "INSTRUMENT").length },
        { libelle: "Cours de formation musicale", nombre: listeCours.filter((c) => c.type === "FM").length },
        { libelle: "Profs", nombre: new Set(listeCours.map((c) => c.profId)).size },
        { libelle: "Élèves dans les listes d'appel (un par cours suivi)", nombre: listeCours.reduce((n, c) => n + c._count.eleves, 0) },
        { libelle: "Séances tenues (appel fait)", nombre: tenues },
        { libelle: "Séances annulées (absence du prof)", nombre: absencesProf.length },
        { libelle: "Séances sans appel", nombre: seances.length - tenues - absencesProf.length },
      ],
      tableaux: [
        {
          titre: "Présence des élèves",
          colonne: "Statut",
          lignes: [
            { libelle: "Présents", nombre: nb("PRESENT") },
            { libelle: "Absences justifiées", nombre: nb("EXCUSE") },
            { libelle: "Absences injustifiées", nombre: nb("ABSENT") },
          ],
        },
        { titre: "Absences des profs", colonne: "Type", lignes: repartition(absencesProf.map((t) => LIBELLE_ABSENCE_PROF[t] ?? t)) },
      ],
      note: `Taux de présence : ${formaterPourcentage(pourcentage(nb("PRESENT"), marques.length))} (séances jusqu'au ${jusquA.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" })}).`,
    },
    {
      titre: "Saison musicale",
      chiffres: [
        { libelle: "Événements", nombre: evenements.length },
        { libelle: "Passages d'élèves en heure musicale", nombre: passages.length },
        { libelle: "Élèves différents passés en heure musicale", nombre: new Set(passages.map((p) => cleNomEleve(p.eleveNom))).size },
      ],
      tableaux: [{ titre: "Événements par type", colonne: "Type", lignes: repartition(evenements.map((e) => libelleTypeEvenement(e.type))) }],
    },
    {
      titre: "Salles",
      chiffres: [
        { libelle: "Réservations de salles validées", nombre: reservations.length },
        { libelle: "Conventions de salle signées et archivées", nombre: conventions },
      ],
      tableaux: [
        { titre: "Réservations par commune", colonne: "Commune", lignes: repartition(reservations.map((r) => r.salle.commune.nom)) },
        { titre: "Réservations par salle", colonne: "Salle", lignes: repartition(reservations.map((r) => `${r.salle.nom} (${r.salle.commune.nom})`)) },
      ],
    },
    {
      titre: "Locations d'instruments",
      chiffres: [
        { libelle: "Instruments loués", nombre: locations.length },
        { libelle: "Locations payées", nombre: locations.filter((l) => l.paye).length },
      ],
      tableaux: [{ titre: "Locations par instrument", colonne: "Instrument", lignes: repartition(locations.map((l) => l.instrument)) }],
    },
    {
      titre: "Déplacements des profs",
      chiffres: [
        { libelle: "Trajets déclarés", nombre: trajets.length },
        { libelle: "Kilomètres", nombre: Math.round(trajets.reduce((s, t) => s + t.km, 0)) },
        { libelle: "Frais kilométriques (€)", nombre: Math.round(trajets.reduce((s, t) => s + t.prix, 0)) },
      ],
      tableaux: [],
    },
  ];
  return { saison, libelle: `${saison}-${saison + 1}`, sections };
}
