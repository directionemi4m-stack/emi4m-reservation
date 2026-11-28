import { db } from "@/lib/db";
import { lireCoordonnees } from "@/lib/coordonneesServeur";
import { infosDeclaration, infosManquantes, nomFichierDeclaration, representationsADeclarer } from "@/lib/declarationSacem";
import { deposerDocumentDevis } from "@/lib/drive";
import { envoyerMailDeclarationSacem } from "@/lib/mail";
import { TYPES_SACEM } from "@/lib/programmes";
import { genererReleveSacem } from "@/lib/recapSacemPdf";
import { versReleve } from "@/lib/sacemServeur";
import { libelleTypeEvenement } from "@/lib/saison";

const inclusion = {
  lieu: true,
  inscriptions: {
    orderBy: [{ ordre: "asc" as const }, { creeLe: "asc" as const }],
    include: { morceaux: { orderBy: { ordre: "asc" as const } }, prof: { select: { prenom: true, nom: true } } },
  },
};

// Le PDF de la déclaration d'une représentation (aperçu, envoi).
export async function pdfDeclarationSacem(evenementId: string) {
  const [e, coordonnees] = await Promise.all([db.evenementSaison.findUnique({ where: { id: evenementId }, include: inclusion }), lireCoordonnees()]);
  if (!e) return null;
  const pdf = await genererReleveSacem({ coordonnees, debut: e.date, finIncluse: e.date, evenements: [versReleve(e)], declaration: infosDeclaration(e) });
  return { evenement: e, pdf, nomFichier: nomFichierDeclaration(e) };
}

// Génère la déclaration, la range dans le Drive (« Déclarations SACEM / 2026 / 2026-12-12
// Concert de Noël - déclaration SACEM.pdf », remplacée sur place si elle y est déjà) et
// l'envoie à la boîte de la direction. Le mail part même si le Drive n'est pas disponible.
export async function envoyerDeclarationSacem(evenementId: string, urlBase: string) {
  const genere = await pdfDeclarationSacem(evenementId);
  if (!genere) return { envoye: false as const, drive: false };
  const { evenement: e, pdf, nomFichier } = genere;

  let fichier: { id: string; url: string } | null = null;
  try {
    fichier = await deposerDocumentDevis({ dossier: "Déclarations SACEM", annee: e.date.getUTCFullYear(), nomFichier, pdf, fichierExistantId: e.sacemDriveFileId });
  } catch (erreur) {
    console.error("Déclaration SACEM non rangée dans le Drive :", erreur);
  }

  const date = e.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const manquantes = infosManquantes(infosDeclaration(e));
  const nbOeuvres = e.inscriptions.reduce((n, i) => n + i.morceaux.length, 0);
  const sansDetail = e.inscriptions.filter((i) => i.morceaux.length === 0).length;
  const texte = [
    `Voici la déclaration SACEM de « ${e.titre} » (${libelleTypeEvenement(e.type).toLowerCase()}) du ${date} : ${e.inscriptions.length} passage${e.inscriptions.length > 1 ? "s" : ""}, ${nbOeuvres} œuvre${nbOeuvres > 1 ? "s" : ""}.`,
    manquantes.length > 0 && `À compléter avant de l'envoyer à la SACEM : ${manquantes.join(", ")}. Saisissez-les dans l'appli, la déclaration sera refaite et renvoyée.`,
    sansDetail > 0 && `${sansDetail} passage${sansDetail > 1 ? "s" : ""} sans le détail des œuvres (titre, compositeur, durée) : à faire compléter par le prof.`,
    "La SACEM demande l'état des recettes et dépenses et le programme dans les 10 jours qui suivent la manifestation (dépôt sur sacem.fr, espace client).",
    fichier ? "Elle est aussi rangée dans le Drive, dossier « Déclarations SACEM »." : "Le Drive n'était pas disponible : elle n'y est pas encore rangée (elle le sera au prochain envoi).",
  ]
    .filter(Boolean)
    .join("\n\n");

  await envoyerMailDeclarationSacem({
    sujet: `Déclaration SACEM — ${e.titre} du ${e.date.toLocaleDateString("fr-FR", { timeZone: "UTC" })}`,
    texte,
    url: `${urlBase}/admin/sacem?evenement=${e.id}`,
    pdf,
    nomFichier,
  });
  await db.evenementSaison.update({
    where: { id: e.id },
    data: { sacemEnvoyeeLe: new Date(), ...(fichier ? { sacemDriveFileId: fichier.id, sacemUrl: fichier.url } : {}) },
  });
  return { envoye: true as const, drive: !!fichier };
}

// Passage du matin (cf. /api/cron/declarations-sacem) : les représentations d'hier, ou des
// 10 derniers jours dont le programme vient d'être saisi, pas encore déclarées.
export async function envoyerDeclarationsDuJour(urlBase: string) {
  const t = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
  const aujourdHui = new Date(`${t}T00:00:00.000Z`);
  const evenements = await db.evenementSaison.findMany({
    where: { type: { in: [...TYPES_SACEM] }, sacemEnvoyeeLe: null, date: { lt: aujourdHui } },
    select: { id: true, date: true, sacemEnvoyeeLe: true, _count: { select: { inscriptions: true } } },
  });
  const aDeclarer = representationsADeclarer(
    evenements.map((e) => ({ ...e, nbPassages: e._count.inscriptions })),
    aujourdHui
  );
  const resultats = [];
  for (const e of aDeclarer) {
    try {
      resultats.push({ id: e.id, ...(await envoyerDeclarationSacem(e.id, urlBase)) });
    } catch (erreur) {
      console.error(`Déclaration SACEM de ${e.id} en échec :`, erreur);
      resultats.push({ id: e.id, envoye: false, erreur: true });
    }
  }
  return { declarations: resultats };
}
