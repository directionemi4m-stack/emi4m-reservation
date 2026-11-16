import { db } from "@/lib/db";
import { depuisModele, elementPourInstrument, lireElements, nouvelId, type ElementPlan, type ModeleElement } from "@/lib/plansScene";

export const LARGEUR_DEFAUT = 1000;
export const PROFONDEUR_DEFAUT = 600;

export function catalogue() {
  return db.elementScene.findMany({ where: { actif: true }, orderBy: [{ categorie: "asc" }, { ordre: "asc" }, { nom: "asc" }] });
}

// Les éléments fixes d'une scène, verrouillés dans un plan.
export const elementsFixes = (brut: unknown): ElementPlan[] => lireElements(brut).map((e) => ({ ...e, id: nouvelId(), fixe: true }));

// Les plans d'un concert dans l'ordre de passage.
export function plansDuConcert(evenementId: string) {
  return db.planScene.findMany({
    where: { evenementId },
    orderBy: [{ ordre: "asc" }, { creeLe: "asc" }],
    include: { inscription: { select: { eleveNom: true, instrument: true, ordre: true } } },
  });
}

// Création d'un plan : passage d'un concert, plan libre ou formation type d'un ensemble. Il
// part d'une scène (dimensions et éléments fixes) et, au choix, du passage précédent ou d'un
// autre plan ; un passage d'élève y place d'emblée son musicien.
export async function creerPlan(params: {
  evenementId: string | null;
  inscriptionId: string | null;
  classeId: string | null;
  modele: boolean;
  source: string; // « vide », « precedent » ou l'id d'un plan à reprendre
  sceneId: string | null;
  titre: string | null;
  auteurId: string;
}) {
  const evenement = params.evenementId ? await db.evenementSaison.findUnique({ where: { id: params.evenementId }, include: { scene: true } }) : null;
  const inscription = params.inscriptionId ? await db.inscriptionHeureMusicale.findUnique({ where: { id: params.inscriptionId } }) : null;
  if (inscription && evenement && inscription.evenementId !== evenement.id) throw new Error("Passage d'un autre concert.");
  const classe = params.classeId ? await db.classe.findUnique({ where: { id: params.classeId }, select: { id: true, nom: true } }) : null;
  const scene = params.sceneId ? await db.sceneConcert.findUnique({ where: { id: params.sceneId } }) : (evenement?.scene ?? null);

  const ordre = inscription
    ? inscription.ordre
    : evenement
      ? ((await db.planScene.aggregate({ where: { evenementId: evenement.id }, _max: { ordre: true } }))._max.ordre ?? -1) + 1
      : 0;

  let source: { largeurCm: number; profondeurCm: number; elements: unknown; classeId: string | null } | null = null;
  if (params.source === "precedent" && evenement) {
    source = await db.planScene.findFirst({
      where: { evenementId: evenement.id, OR: [{ ordre: { lt: ordre } }, { ordre }] },
      orderBy: [{ ordre: "desc" }, { creeLe: "desc" }],
    });
  } else if (params.source && params.source !== "vide" && params.source !== "precedent") {
    source = await db.planScene.findUnique({ where: { id: params.source } });
  }

  const largeurCm = scene?.largeurCm ?? source?.largeurCm ?? LARGEUR_DEFAUT;
  const profondeurCm = scene?.profondeurCm ?? source?.profondeurCm ?? PROFONDEUR_DEFAUT;
  const fixes = scene ? elementsFixes(scene.elements) : lireElements(source?.elements).filter((e) => e.fixe);
  const repris = lireElements(source?.elements)
    .filter((e) => !e.fixe)
    .map((e) => ({ ...e, id: nouvelId() }));
  const elements = [...fixes, ...repris];

  // Le musicien du passage, s'il n'est pas déjà sur le plan.
  if (inscription && !elements.some((e) => e.label?.toLowerCase() === inscription.eleveNom.toLowerCase())) {
    const modele = elementPourInstrument(inscription.instrument, (await catalogue()) as ModeleElement[]);
    if (modele) elements.push(depuisModele(modele, Math.round(largeurCm / 2), Math.round(profondeurCm * 0.55), inscription.eleveNom));
  }

  const titre =
    params.titre?.trim().slice(0, 120) ||
    (inscription ? `${inscription.eleveNom} — ${inscription.instrument}` : classe ? classe.nom : params.modele ? "Formation" : "Nouveau plan");
  return db.planScene.create({
    data: {
      titre,
      sceneId: scene?.id ?? null,
      largeurCm,
      profondeurCm,
      elements: elements as unknown as object[],
      evenementId: evenement?.id ?? null,
      inscriptionId: inscription?.id ?? null,
      ordre,
      classeId: classe?.id ?? source?.classeId ?? null,
      modele: params.modele,
      auteurId: params.auteurId,
    },
  });
}
