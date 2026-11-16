import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { lireCoordonnees } from "@/lib/coordonneesServeur";
import { genererContratSigne, type SignataireContrat } from "@/lib/contratsPdf";
import { dossierProf, LIBELLE_TYPE_CONTRAT, nomFichierContrat, VALIDITE_LIEN_JOURS } from "@/lib/contrats";
import { libelleAnneeScolaire } from "@/lib/fraisRecap";
import { deposerContrat } from "@/lib/drive";
import { envoyerMailContratAuProf, envoyerMailDocument, envoyerMailPresidenceContrats } from "@/lib/mail";
import { envoyerPush } from "@/lib/push";

export const empreinte = (o: Uint8Array) => createHash("sha256").update(o).digest("hex");
const nomComplet = (p: { prenom: string; nom: string }) => `${p.prenom} ${p.nom}`.trim();

// Contrats transmis à la présidence et pas encore signés par elle.
export const attendPresidence = { papier: false, envoyeLe: { not: null }, presidenceSigneLe: null } as const;

export function chargerContrat(id: string) {
  return db.contratProf.findUnique({ where: { id }, include: { prof: { select: { id: true, prenom: true, nom: true, email: true } } } });
}
type ContratComplet = NonNullable<Awaited<ReturnType<typeof chargerContrat>>>;

export const titreContrat = (c: { type: "CONTRAT" | "AVENANT"; titre: string; anneeDebut: number }) =>
  `${LIBELLE_TYPE_CONTRAT[c.type]} ${libelleAnneeScolaire(c.anneeDebut)} — ${c.titre}`;

// Le PDF dans son état du moment : l'original, avec les paraphes et la page des signatures
// dès qu'une partie a signé (un document papier reste tel quel).
export async function pdfContrat(c: ContratComplet): Promise<{ pdf: Uint8Array; nomFichier: string }> {
  const signe = !!c.profSigneLe;
  const nomFichier = nomFichierContrat(c, signe || c.papier);
  if (c.papier || !c.presidenceSigneLe) return { pdf: c.pdf, nomFichier };
  const signataires: SignataireContrat[] = [];
  if (c.presidenceSigneLe && c.presidenceParaphe && c.presidenceSignature) {
    signataires.push({
      role: "Pour l'EMI4M, l'employeur",
      nom: c.presidenceNom ?? "",
      detail: c.presidenceQualite ?? "",
      signeLe: c.presidenceSigneLe,
      paraphe: c.presidenceParaphe,
      signature: c.presidenceSignature,
    });
  }
  if (c.profSigneLe && c.profParaphe && c.profSignature) {
    signataires.push({ role: "Le salarié", nom: nomComplet(c.prof), detail: c.prof.email, signeLe: c.profSigneLe, paraphe: c.profParaphe, signature: c.profSignature });
  }
  const pdf = await genererContratSigne({ original: c.pdf, titre: titreContrat(c), salarie: nomComplet(c.prof), empreinte: c.empreinte, signataires });
  return { pdf, nomFichier };
}

// Dépôt (ou remplacement) de la copie dans le Drive : « Contrats des profs / 2026-2027 / NOM Prénom ».
export async function archiverContrat(id: string): Promise<boolean> {
  const c = await chargerContrat(id);
  if (!c) return false;
  const { pdf, nomFichier } = await pdfContrat(c);
  const depot = await deposerContrat({
    saison: libelleAnneeScolaire(c.anneeDebut),
    dossierProf: dossierProf(c.prof),
    nomFichier,
    pdf,
    fichierExistantId: c.driveFileId,
  });
  if (!depot) return false;
  await db.contratProf.update({ where: { id }, data: { driveFileId: depot.id, driveUrl: depot.url } });
  return true;
}

// --- Présidence ---

export async function presidence() {
  const c = await lireCoordonnees();
  const email = c.presidenceEmail?.trim().toLowerCase() || null;
  return { nom: c.presidenceNom?.trim() || null, qualite: c.presidenceQualite?.trim() || null, email };
}

// Un seul lien valable à la fois, pour la présidence en cours : en envoyer un nouveau
// annule les précédents. Renvoie un message d'erreur, ou null si le mail est parti.
export async function envoyerLienPresidence(urlBase: string): Promise<string | null> {
  const p = await presidence();
  if (!p.email || !p.nom) return "Indiquez le nom et le mail de la présidence dans Paramètres › Coordonnées de l'école.";
  const nombre = await db.contratProf.count({ where: attendPresidence });
  if (nombre === 0) return "Aucun document n'attend la signature de la présidence.";
  const jeton = randomBytes(32).toString("base64url");
  const expire = new Date(Date.now() + VALIDITE_LIEN_JOURS * 24 * 3600 * 1000);
  await db.$transaction([db.lienPresidence.deleteMany({}), db.lienPresidence.create({ data: { jeton: empreinte(Buffer.from(jeton)), email: p.email, expire } })]);
  try {
    await envoyerMailPresidenceContrats({ email: p.email, nom: p.nom, nombre, url: `${urlBase}/signature-presidence/${jeton}`, jours: VALIDITE_LIEN_JOURS });
  } catch (erreur) {
    console.error("Mail à la présidence non envoyé :", erreur);
    return "Le mail à la présidence n'a pas pu partir. Réessayez.";
  }
  return null;
}

// Le lien est-il encore valable, et pour la présidence actuelle ?
export async function lienPresidenceValide(jeton: string) {
  if (!/^[A-Za-z0-9_-]{30,60}$/.test(jeton)) return null;
  const lien = await db.lienPresidence.findUnique({ where: { jeton: empreinte(Buffer.from(jeton)) } });
  if (!lien || lien.expire < new Date()) return null;
  const p = await presidence();
  if (!p.email || !p.nom || p.email !== lien.email) return null;
  return { nom: p.nom, qualite: p.qualite, email: p.email };
}

// Après la signature de la présidence : chaque prof reçoit son document (PDF joint) et une
// notification pour le signer à son tour.
export async function prevenirProfs(ids: string[], urlBase: string): Promise<number> {
  let envoyes = 0;
  for (const id of ids) {
    const c = await chargerContrat(id);
    if (!c || !c.presidenceSigneLe || c.profSigneLe) continue;
    try {
      const { pdf, nomFichier } = await pdfContrat(c);
      await envoyerMailContratAuProf({ prof: c.prof, titre: titreContrat(c), url: `${urlBase}/contrats`, pdf, nomFichier });
      envoyes++;
    } catch (erreur) {
      console.error(`Contrat non envoyé à ${c.prof.email} :`, erreur);
    }
    await envoyerPush([c.prof.id], { titre: "Contrat à signer", corps: `« ${titreContrat(c)} » est signé par la présidence : à vous de signer.`, url: "/contrats" });
  }
  return envoyes;
}

// Après la signature du prof : archive dans le Drive et exemplaire signé par les deux envoyé
// au prof. Renvoie les éventuels problèmes, à afficher.
export async function finaliserContrat(id: string): Promise<string[]> {
  const notes: string[] = [];
  const c = await chargerContrat(id);
  if (!c?.profSigneLe) return notes;
  try {
    if (!(await archiverContrat(id))) notes.push("la copie sera rangée dans le Drive un peu plus tard");
  } catch (erreur) {
    console.error("Contrat signé non déposé dans le Drive :", erreur);
    notes.push("la copie sera rangée dans le Drive un peu plus tard");
  }
  try {
    const { pdf, nomFichier } = await pdfContrat(c);
    await envoyerMailDocument({
      a: c.prof.email,
      sujet: `Votre exemplaire signé — ${titreContrat(c)}`,
      message: `Bonjour ${c.prof.prenom},\n\nVoici votre exemplaire de « ${titreContrat(c)} », signé par la présidence et par vous. Gardez-le précieusement.\n\nLa direction de l'EMI4M`,
      pdf,
      nomFichier,
    });
    await db.contratProf.update({ where: { id }, data: { copieEnvoyeeLe: new Date() } });
  } catch (erreur) {
    console.error("Exemplaire signé non envoyé au prof :", erreur);
    notes.push("votre exemplaire n'a pas pu être envoyé par mail, mais il reste téléchargeable ici");
  }
  return notes;
}
