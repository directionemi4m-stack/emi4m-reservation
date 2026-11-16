import { db } from "@/lib/db";
import { rapprocheurAnnuaire } from "@/lib/annuaireEleves";
import { lireElements } from "@/lib/plansScene";
import { catalogue } from "@/lib/plansSceneServeur";
import type { Membre, SceneChoix } from "@/components/plans/EditeurPlan";

// Ce dont l'éditeur a besoin : catalogue, scènes, ensembles et leurs élèves (instrument
// retrouvé dans l'annuaire), pour les proposer à placer.
export async function donneesEditeur() {
  const [elements, scenes, classes, annuaire] = await Promise.all([
    catalogue(),
    db.sceneConcert.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }),
    db.classe.findMany({
      where: { actif: true, type: "INSTRUMENT" },
      orderBy: [{ agendaLibre: "desc" }, { nom: "asc" }],
      select: { id: true, nom: true, prof: { select: { prenom: true } }, eleves: { where: { actif: true }, select: { nom: true }, orderBy: { nom: "asc" } } },
    }),
    db.eleveAnnuaire.findMany({ select: { nom: true, prenom: true, instruments: true } }),
  ]);
  const retrouver = rapprocheurAnnuaire(annuaire);
  const membres: Record<string, Membre[]> = {};
  for (const c of classes) membres[c.id] = c.eleves.map((e) => ({ nom: e.nom, instrument: retrouver(e.nom)?.eleve.instruments[0] ?? null }));
  return {
    catalogue: elements.map((e) => ({ ...e })),
    scenes: scenes.map((s): SceneChoix => ({ id: s.id, nom: s.nom, largeurCm: s.largeurCm, profondeurCm: s.profondeurCm, elements: lireElements(s.elements) })),
    classes: classes.map((c) => ({ id: c.id, nom: `${c.nom} (${c.prof.prenom})` })),
    membres,
  };
}
