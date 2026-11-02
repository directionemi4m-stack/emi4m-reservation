import { db } from "@/lib/db";
import { genererRegistreCles, type LigneRegistre } from "@/lib/registreClesPdf";
import { deposerRegistreCles } from "@/lib/drive";

// Le compte partagé de la boîte mail de la direction n'est pas une personne : il ne reçoit
// pas de clés et n'a pas de ligne au registre.
const MAIL_DIRECTION = process.env.EMAIL_DIRECTION || "direction.emi4m@gmail.com";
export const salariesDuRegistre = { actif: true, email: { not: MAIL_DIRECTION } };

export const debutSaison = (anneeDebut: number) => new Date(Date.UTC(anneeDebut, 8, 1));

// Remises concernées par une saison : faites pendant la saison, ou faites avant et encore
// détenues au début de la saison (une clé gardée d'une année sur l'autre reste au registre).
export function filtreSaison(anneeDebut: number) {
  const debut = debutSaison(anneeDebut);
  const fin = debutSaison(anneeDebut + 1);
  return {
    OR: [
      { remiseLe: { gte: debut, lt: fin } },
      { remiseLe: { lt: debut }, OR: [{ restitueLe: null }, { restitueLe: { gte: debut } }] },
    ],
  };
}

// Régénère le registre PDF de la saison et le dépose dans le Drive (même fichier mis à jour).
// Tous les salariés actifs y figurent, avec une ligne vide s'ils n'ont rien reçu.
export async function regenererRegistre(anneeDebut: number, responsable: string) {
  const [profs, remises, existant] = await Promise.all([
    db.user.findMany({ where: salariesDuRegistre, orderBy: [{ nom: "asc" }, { prenom: "asc" }], select: { id: true, prenom: true, nom: true } }),
    db.remiseCles.findMany({
      where: filtreSaison(anneeDebut),
      orderBy: { remiseLe: "asc" },
      include: { prof: { select: { prenom: true, nom: true, actif: true } } },
    }),
    db.registreCles.findUnique({ where: { anneeDebut } }),
  ]);

  const nom = (p: { prenom: string; nom: string }) => `${p.prenom} ${p.nom}`.trim();
  const lignes: LigneRegistre[] = [];
  // Les salariés actifs dans l'ordre alphabétique, puis ceux partis qui ont encore une ligne.
  const ordre = [...profs.map((p) => p.id), ...remises.filter((r) => !r.prof.actif).map((r) => r.profId)];
  for (const profId of [...new Set(ordre)]) {
    const siennes = remises.filter((r) => r.profId === profId);
    const prof = profs.find((p) => p.id === profId) ?? siennes[0]?.prof;
    if (!prof) continue;
    if (siennes.length === 0) {
      lignes.push({
        prof: nom(prof),
        clesAutransMeaudre: 0,
        badgeLans: 0,
        clesVillard: 0,
        remiseLe: null,
        signatureRemise: null,
        restitueLe: null,
        signatureRestitution: null,
        restitutionPapier: false,
      });
    }
    for (const r of siennes) {
      lignes.push({
        prof: nom(prof),
        clesAutransMeaudre: r.clesAutransMeaudre,
        badgeLans: r.badgeLans,
        clesVillard: r.clesVillard,
        remiseLe: r.remiseLe,
        signatureRemise: r.signatureRemise,
        restitueLe: r.restitueLe,
        signatureRestitution: r.signatureRestitution,
        restitutionPapier: r.restitutionPapier,
      });
    }
  }

  const saison = `${anneeDebut}-${anneeDebut + 1}`;
  const pdf = await genererRegistreCles({ saison, lignes, responsable });
  const fichier = await deposerRegistreCles({
    nomFichier: `Registre clés et badges ${saison}.pdf`,
    pdf,
    fichierExistantId: existant?.driveFileId ?? null,
  });
  if (!fichier) return null;
  return db.registreCles.upsert({
    where: { anneeDebut },
    create: { anneeDebut, driveFileId: fichier.id, url: fichier.url },
    update: { driveFileId: fichier.id, url: fichier.url },
  });
}
