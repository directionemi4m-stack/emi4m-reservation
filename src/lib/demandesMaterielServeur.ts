import { db } from "@/lib/db";
import { euros } from "@/lib/devis";
import { ecrireTableauMateriel, type LigneTableauMateriel } from "@/lib/drive";
import { estCopieDeTest } from "@/lib/modeTest";
import { cellulePropositions, coutDemande, INFOS_STATUT, INFOS_URGENCE, STATUTS_EN_COURS, trierPourTableau, type Urgence } from "@/lib/demandesMateriel";

const COULEURS: Record<Urgence, { red: number; green: number; blue: number }> = {
  URGENTE: { red: 0.98, green: 0.76, blue: 0.76 },
  HAUTE: { red: 1, green: 0.86, blue: 0.7 },
  NORMALE: { red: 0.8, green: 0.91, blue: 0.98 },
  BASSE: { red: 0.92, green: 0.93, blue: 0.95 },
};

async function lignesDuTableau(): Promise<{ lignes: LigneTableauMateriel[]; enCours: number; totalEnCours: number }> {
  const demandes = trierPourTableau(
    await db.demandeMateriel.findMany({
      include: { auteur: { select: { prenom: true, nom: true } }, propositions: { orderBy: { creeLe: "asc" } } },
    })
  );
  let enCours = 0;
  let totalEnCours = 0;
  const lignes = demandes.map((d) => {
    const cout = coutDemande(d.quantite, d.propositions);
    if (STATUTS_EN_COURS.includes(d.statut)) {
      enCours++;
      totalEnCours += cout?.centimes ?? 0;
    }
    return {
      urgence: INFOS_URGENCE[d.urgence].libelle,
      couleurUrgence: COULEURS[d.urgence],
      statut: INFOS_STATUT[d.statut].libelle,
      date: d.creeLe,
      prof: d.auteur ? `${d.auteur.prenom} ${d.auteur.nom}` : "Compte supprimé",
      materiel: d.titre,
      quantite: d.quantite,
      details: d.details ?? "",
      propositions: cellulePropositions(d.propositions, euros),
      coutCentimes: cout?.centimes ?? null,
      baseCout: cout ? (cout.retenue ? "Retenue" : "Moins chère") : "",
      reponse: d.reponse ?? "",
    };
  });
  return { lignes, enCours, totalEnCours };
}

// Réécrit le tableau du Drive. Si une demande a changé pendant l'écriture, on recommence pour
// que ce soit bien le dernier état qui reste. Une erreur Google ne bloque jamais l'appli : elle
// est notée, et la direction peut relancer la mise à jour.
export async function synchroniserTableauMateriel(): Promise<boolean> {
  if (estCopieDeTest()) return true;
  try {
    for (let essai = 0; essai < 3; essai++) {
      const { lignes, enCours, totalEnCours } = await lignesDuTableau();
      const jour = new Date().toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });
      const resume = `Mis à jour par l'appli le ${jour} · ${enCours} en cours · ${euros(totalEnCours)} estimés. À modifier dans l'appli : ce qui est changé ici est remplacé à la prochaine mise à jour.`;
      const fichier = await ecrireTableauMateriel(lignes, resume);
      if (!fichier) throw new Error("Connexion au Drive indisponible.");
      const apres = await lignesDuTableau();
      if (JSON.stringify(apres.lignes) === JSON.stringify(lignes)) {
        await db.tableauMateriel.update({ where: { id: "singleton" }, data: { majLe: new Date(), echecLe: null } });
        return true;
      }
    }
    throw new Error("Demandes modifiées pendant la mise à jour.");
  } catch (erreur) {
    console.error("Tableau des demandes de matériel non mis à jour :", erreur);
    const echecLe = new Date();
    await db.tableauMateriel.upsert({ where: { id: "singleton" }, create: { echecLe }, update: { echecLe } }).catch(() => undefined);
    return false;
  }
}
