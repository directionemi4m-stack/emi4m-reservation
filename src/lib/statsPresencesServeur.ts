import { db } from "@/lib/db";
import { nomAffiche, rapprocheurAnnuaire } from "@/lib/annuaireEleves";
import { anneeScolaireDebut } from "@/lib/fraisRecap";
import type { MarqueStat } from "@/lib/statsPresences";

// Les présences notées de la saison en cours, chaque élève rattaché à sa fiche de
// l'annuaire (pour le compter une seule fois s'il suit plusieurs cours).
export async function marquesDeLaSaison(maintenant = new Date()): Promise<{ saison: string; marques: MarqueStat[] }> {
  const debut = anneeScolaireDebut(maintenant);
  const [annuaire, marques] = await Promise.all([
    db.eleveAnnuaire.findMany({ select: { id: true, nom: true, prenom: true, instruments: true } }),
    db.presenceMarque.findMany({
      where: { pointage: { seance: { date: { gte: new Date(Date.UTC(debut, 8, 1)), lt: new Date(Date.UTC(debut + 1, 8, 1)) } } } },
      select: {
        statut: true,
        eleve: { select: { id: true, nom: true } },
        pointage: {
          select: {
            seance: { select: { date: true } },
            classe: { select: { nom: true, prof: { select: { prenom: true, nom: true } } } },
          },
        },
      },
    }),
  ]);
  const retrouver = rapprocheurAnnuaire(annuaire);
  const fiches = new Map<string, { personne: string; nom: string }>();
  return {
    saison: `${debut}-${debut + 1}`,
    marques: marques.map((m) => {
      const classe = m.pointage.classe;
      let qui = fiches.get(m.eleve.id);
      if (!qui) {
        const r = retrouver(m.eleve.nom, classe.nom);
        qui = r ? { personne: r.eleve.id, nom: nomAffiche(r.eleve) } : { personne: `liste-${m.eleve.id}`, nom: m.eleve.nom };
        fiches.set(m.eleve.id, qui);
      }
      return {
        ...qui,
        cours: classe.nom,
        prof: `${classe.prof.prenom} ${classe.prof.nom}`,
        date: m.pointage.seance.date,
        statut: m.statut,
      };
    }),
  };
}
