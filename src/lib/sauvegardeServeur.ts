import { db } from "@/lib/db";
import { deposerSauvegarde } from "@/lib/drive";
import { envoyerAlerteDirection } from "@/lib/mail";
import { creerSauvegarde } from "@/lib/sauvegarde";

// Sauvegarde la base dans le Drive et note le résultat ; en cas d'échec, la direction est
// prévenue par mail (une sauvegarde manquée ne doit pas passer inaperçue).
export async function lancerSauvegarde(urlBase: string) {
  const tenteeLe = new Date();
  try {
    const { contenu, nbLignes } = await creerSauvegarde();
    const jour = tenteeLe.toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
    const fichier = await deposerSauvegarde({ nomFichier: `sauvegarde-${jour}.json.gz`, contenu });
    if (!fichier) throw new Error("Google Drive n'est pas connecté.");
    const etat = { tenteeLe, reussieLe: tenteeLe, fichierUrl: fichier.url, taille: contenu.length, nbLignes, erreur: null };
    await db.etatSauvegarde.upsert({ where: { id: "singleton" }, create: etat, update: etat });
    return { ok: true as const, taille: contenu.length, nbLignes };
  } catch (erreur) {
    console.error("Sauvegarde de la base en échec :", erreur);
    const message = erreur instanceof Error ? erreur.message : String(erreur);
    await db.etatSauvegarde.upsert({
      where: { id: "singleton" },
      create: { tenteeLe, erreur: message.slice(0, 500) },
      update: { tenteeLe, erreur: message.slice(0, 500) },
    });
    try {
      await envoyerAlerteDirection({
        sujet: "La sauvegarde hebdomadaire de l'appli EMI4M a échoué",
        titre: "Sauvegarde en échec",
        texte: "La copie hebdomadaire de la base de l'appli n'a pas pu être déposée dans le Drive. Vérifiez la connexion Google Drive, puis relancez la sauvegarde depuis la page ci-dessous.",
        url: `${urlBase}/admin/parametres/google-drive`,
        libelleBouton: "Ouvrir la page Google Drive",
      });
    } catch (e) {
      console.error("Alerte de sauvegarde non envoyée :", e);
    }
    return { ok: false as const, erreur: message };
  }
}
