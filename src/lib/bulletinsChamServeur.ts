import { db } from "@/lib/db";
import { genererBulletinPdf } from "@/lib/bulletinPdf";
import { contenuMailBulletin, libelleDirection, libelleMatiere, libellePeriode, libelleTrimestre, periodeCourante, rappelDuJour, type TypeRappel } from "@/lib/bulletinsCham";
import { classeEnAnnee } from "@/lib/cham";
import { MAIL_DIRECTION } from "@/lib/clesServeur";
import { lireCoordonnees } from "@/lib/coordonneesServeur";
import { lireCalendrierBulletins } from "@/lib/calendrierBulletinsServeur";
import { deposerBulletinCham } from "@/lib/drive";
import { envoyerMailBulletinFamille, envoyerMailRappelBulletins } from "@/lib/mail";
import { envoyerPush } from "@/lib/push";

const nomComplet = (u: { prenom: string; nom: string }) => `${u.prenom} ${u.nom}`.trim();

// La direction actuelle, telle que réglée dans Paramètres › Coordonnées de l'école.
export async function nomDirection(): Promise<string> {
  const c = await lireCoordonnees();
  return libelleDirection(c.directionNom, c.directionFonction);
}

// Tout ce qu'il faut pour fabriquer le PDF du bulletin d'un élève pour un trimestre : le
// même PDF sert pour le Drive et pour l'envoi aux familles.
async function preparerBulletin(eleveId: string, anneeDebut: number, trimestre: number) {
  const [eleve, appreciations, bulletin, direction] = await Promise.all([
    db.eleveCham.findUnique({ where: { id: eleveId }, select: { prenom: true, nom: true, email: true, anneeSixieme: true } }),
    db.appreciationCham.findMany({
      where: { eleveId, anneeDebut, trimestre },
      include: { prof: { select: { prenom: true, nom: true, email: true } } },
      orderBy: { signeLe: "asc" },
    }),
    db.bulletinCham.findUnique({ where: { eleveId_anneeDebut_trimestre: { eleveId, anneeDebut, trimestre } } }),
    nomDirection(),
  ]);
  if (!eleve || (appreciations.length === 0 && !bulletin?.signatureDirection)) return null;

  const fabriquerPdf = () =>
    genererBulletinPdf({
      // La classe de l'année du bulletin (un bulletin de l'an dernier garde la classe d'alors).
      eleve: { ...eleve, classe: classeEnAnnee(eleve.anneeSixieme, anneeDebut) },
      anneeDebut,
      trimestre,
      parties: appreciations.map((a) => ({
        matiere: a.matiere,
        precision: a.precision,
        profId: a.profId,
        profNom: a.signataireNom ?? (a.prof.email === MAIL_DIRECTION ? direction : nomComplet(a.prof)),
        texte: a.texte,
        signature: a.signature,
        signeLe: a.signeLe,
      })),
      direction: { signature: bulletin?.signatureDirection ?? null, nom: bulletin?.directionNom ?? direction },
    });
  return { eleve, bulletin, fabriquerPdf };
}

// Régénère le PDF du bulletin d'un élève (toutes les parties signées) et le
// dépose dans le Drive. Appelé après chaque signature ; une erreur Google est remontée à
// l'appelant, qui ne doit pas faire échouer la saisie pour autant.
export async function compilerBulletin(eleveId: string, anneeDebut: number, trimestre: number) {
  const prepare = await preparerBulletin(eleveId, anneeDebut, trimestre);
  if (!prepare) return null;
  const { eleve, bulletin, fabriquerPdf } = prepare;

  const fichier = await deposerBulletinCham({
    dossiers: [`Bulletins ${anneeDebut}-${anneeDebut + 1}`, libelleTrimestre(trimestre)],
    nomFichier: `${eleve.nom.toUpperCase()} ${eleve.prenom} — bulletin CHAM T${trimestre}.pdf`,
    pdf: await fabriquerPdf(),
    fichierExistantId: bulletin?.documentDriveId ?? null,
  });
  if (!fichier) return null;

  return db.bulletinCham.upsert({
    where: { eleveId_anneeDebut_trimestre: { eleveId, anneeDebut, trimestre } },
    create: { eleveId, anneeDebut, trimestre, documentDriveId: fichier.id, documentUrl: fichier.url, documentMajLe: new Date() },
    update: { documentDriveId: fichier.id, documentUrl: fichier.url, documentMajLe: new Date() },
  });
}

// --- Envoi des bulletins aux familles ---

export type EtatEnvoi = "pret" | "envoye" | "incomplet" | "sans_mail";

export interface EnvoiEleve {
  eleveId: string;
  libelle: string; // « MARTIN Léa »
  prenom: string;
  nom: string;
  email: string | null;
  etat: EtatEnvoi;
  manque: string[]; // ce qui empêche l'envoi d'un bulletin incomplet
  manqueProfs: string[]; // la même liste, sans la signature de la direction
  signe: boolean; // signé par la direction
  aDesParties: boolean; // au moins une appréciation : il y a quelque chose à signer
  envoyeLe: Date | null;
  envoyeA: string | null;
  documentUrl: string | null;
  modifieApresSignature: boolean; // un prof a re-signé sa partie après la direction
  modifieApresEnvoi: boolean; // la famille a reçu une version plus ancienne
}

// Pour chaque élève CHAM, où en est l'envoi de son bulletin : un bulletin n'est complet
// (donc envoyable) que si chaque prof déclaré a signé sa partie et que la direction a
// signé le bulletin.
export async function etatsEnvoi(anneeDebut: number, trimestre: number): Promise<EnvoiEleve[]> {
  const [eleves, suivis, signees, bulletins, direction] = await Promise.all([
    db.eleveCham.findMany({ orderBy: [{ nom: "asc" }, { prenom: "asc" }], select: { id: true, prenom: true, nom: true, email: true } }),
    db.suiviCham.findMany({ include: { prof: { select: { prenom: true, nom: true, email: true } } } }),
    db.appreciationCham.findMany({ where: { anneeDebut, trimestre }, select: { eleveId: true, profId: true, matiere: true, signeLe: true } }),
    db.bulletinCham.findMany({ where: { anneeDebut, trimestre }, select: { eleveId: true, signeDirectionLe: true, envoyeLe: true, envoyeA: true, documentUrl: true } }),
    nomDirection(),
  ]);
  const faites = new Set(signees.map((a) => `${a.eleveId}|${a.profId}|${a.matiere}`));
  const parEleve = new Map(bulletins.map((b) => [b.eleveId, b]));

  return eleves.map((e) => {
    const attendus = suivis.filter((s) => s.eleveId === e.id);
    const bulletin = parEleve.get(e.id);
    const manqueProfs = [
      ...(attendus.length === 0 ? ["aucun prof déclaré"] : []),
      ...attendus
        .filter((s) => !faites.has(`${s.eleveId}|${s.profId}|${s.matiere}`))
        .map((s) => `${s.precision || libelleMatiere(s.matiere)} (${s.prof.email === MAIL_DIRECTION ? direction : nomComplet(s.prof)})`),
    ];
    const derniere = Math.max(0, ...signees.filter((a) => a.eleveId === e.id).map((a) => a.signeLe.getTime()));
    const manque = [...manqueProfs, ...(bulletin?.signeDirectionLe ? [] : ["signature de la direction"])];
    const etat: EtatEnvoi = bulletin?.envoyeLe
      ? "envoye"
      : manque.length > 0
        ? "incomplet"
        : e.email
          ? "pret"
          : "sans_mail";
    return {
      eleveId: e.id,
      libelle: `${e.nom.toUpperCase()} ${e.prenom}`,
      prenom: e.prenom,
      nom: e.nom,
      email: e.email,
      etat,
      manque,
      manqueProfs,
      signe: Boolean(bulletin?.signeDirectionLe),
      aDesParties: signees.some((a) => a.eleveId === e.id),
      envoyeLe: bulletin?.envoyeLe ?? null,
      envoyeA: bulletin?.envoyeA ?? null,
      documentUrl: bulletin?.documentUrl ?? null,
      modifieApresSignature: Boolean(bulletin?.signeDirectionLe && derniere > bulletin.signeDirectionLe.getTime()),
      modifieApresEnvoi: Boolean(bulletin?.envoyeLe && derniere > bulletin.envoyeLe.getTime()),
    };
  });
}

// Le PDF tel qu'il partirait maintenant, pour le relire avant l'envoi.
export async function pdfBulletinActuel(eleveId: string, anneeDebut: number, trimestre: number) {
  const prepare = await preparerBulletin(eleveId, anneeDebut, trimestre);
  if (!prepare) return null;
  return { pdf: await prepare.fabriquerPdf(), nomFichier: contenuMailBulletin(prepare.eleve, anneeDebut, trimestre).nomFichier };
}

// Envoie le bulletin d'un élève à l'adresse confirmée par la direction, PDF en pièce jointe.
// L'envoi est réservé en base avant de partir : deux clics ou deux onglets ne peuvent pas
// envoyer deux fois le même bulletin. Un échec rétablit l'état précédent.
export async function envoyerBulletinFamille(eleveId: string, anneeDebut: number, trimestre: number, adresse: string, renvoi: boolean) {
  const prepare = await preparerBulletin(eleveId, anneeDebut, trimestre);
  if (!prepare?.bulletin) throw new Error("Bulletin introuvable.");
  const { eleve, bulletin, fabriquerPdf } = prepare;
  const pdf = await fabriquerPdf();
  const cle = { eleveId, anneeDebut, trimestre };
  const envoi = { envoyeLe: new Date(), envoyeA: adresse };
  const { count } = await db.bulletinCham.updateMany({ where: renvoi ? { ...cle, envoyeLe: bulletin.envoyeLe } : { ...cle, envoyeLe: null }, data: envoi });
  if (count === 0) throw new Error("Ce bulletin vient déjà d'être envoyé.");
  try {
    await envoyerMailBulletinFamille({ email: adresse, contenu: contenuMailBulletin(eleve, anneeDebut, trimestre), pdf });
  } catch (erreur) {
    await db.bulletinCham.updateMany({ where: { ...cle, envoyeLe: envoi.envoyeLe }, data: { envoyeLe: bulletin.envoyeLe, envoyeA: bulletin.envoyeA } });
    throw erreur;
  }
}

// Ce qu'il reste à signer pour un trimestre, prof par prof : chaque élève suivi dont la
// partie n'a pas encore été signée.
export async function bulletinsARemplir(anneeDebut: number, trimestre: number): Promise<Map<string, string[]>> {
  const [suivis, signees] = await Promise.all([
    db.suiviCham.findMany({ include: { eleve: { select: { prenom: true, nom: true } } }, orderBy: { eleve: { nom: "asc" } } }),
    db.appreciationCham.findMany({ where: { anneeDebut, trimestre }, select: { eleveId: true, profId: true, matiere: true } }),
  ]);
  const faites = new Set(signees.map((a) => `${a.eleveId}|${a.profId}|${a.matiere}`));
  const parProf = new Map<string, string[]>();
  for (const s of suivis) {
    if (faites.has(`${s.eleveId}|${s.profId}|${s.matiere}`)) continue;
    const ligne = `${s.eleve.nom.toUpperCase()} ${s.eleve.prenom} — ${s.precision || libelleMatiere(s.matiere)}`;
    parProf.set(s.profId, [...(parProf.get(s.profId) ?? []), ligne]);
  }
  return parProf;
}

// Passage quotidien du cron : le 15, annonce à tous les profs ; 4 jours après, relance de
// ceux qui ont encore des bulletins à signer. Chaque envoi n'a lieu qu'une fois.
export async function envoyerRappelsBulletins(maintenant: Date, urlBase: string) {
  const calendrier = await lireCalendrierBulletins(periodeCourante(maintenant).anneeDebut);
  const rappel = rappelDuJour(maintenant, calendrier);
  if (!rappel) return { envoi: null };
  const { anneeDebut, trimestre, type } = rappel;

  const dejaFait = await db.rappelBulletinCham.findUnique({
    where: { anneeDebut_trimestre_type: { anneeDebut, trimestre, type } },
  });
  if (dejaFait) return { envoi: null };

  // La relance d'un trimestre n'a plus de sens si l'annonce n'est jamais partie (appli mise
  // en service entre les deux) : on envoie alors l'annonce, adressée à tous.
  let typeEffectif: TypeRappel = type;
  if (type === "RELANCE") {
    const annonce = await db.rappelBulletinCham.findUnique({
      where: { anneeDebut_trimestre_type: { anneeDebut, trimestre, type: "OUVERTURE" } },
    });
    if (!annonce) typeEffectif = "OUVERTURE";
  }

  // On réserve l'envoi avant de l'effectuer : deux passages simultanés ne peuvent pas
  // tous deux l'obtenir (contrainte d'unicité).
  await db.rappelBulletinCham.create({ data: { anneeDebut, trimestre, type } });
  if (typeEffectif !== type) {
    await db.rappelBulletinCham.upsert({
      where: { anneeDebut_trimestre_type: { anneeDebut, trimestre, type: "OUVERTURE" } },
      create: { anneeDebut, trimestre, type: "OUVERTURE" },
      update: {},
    });
  }

  const aRemplir = await bulletinsARemplir(anneeDebut, trimestre);
  const profs = await db.user.findMany({
    where: { actif: true, ...(typeEffectif === "RELANCE" ? { id: { in: [...aRemplir.keys()] } } : {}) },
    select: { id: true, prenom: true, email: true },
  });

  const periode = libellePeriode(anneeDebut, trimestre);
  const url = `${urlBase}/bulletins-cham`;
  let mails = 0;
  for (const prof of profs) {
    try {
      await envoyerMailRappelBulletins({ prof, periode, type: typeEffectif, aRemplir: aRemplir.get(prof.id) ?? [], url });
      mails++;
    } catch (erreur) {
      console.error(`Rappel bulletins non envoyé à ${prof.email} :`, erreur);
    }
  }

  const notifications = await envoyerPush(
    profs.map((p) => p.id),
    {
      titre: typeEffectif === "OUVERTURE" ? "Bulletins CHAM à remplir" : "Rappel : bulletins CHAM",
      corps:
        typeEffectif === "OUVERTURE"
          ? `C'est le moment de remplir les bulletins du ${periode}.`
          : `Il vous reste des bulletins du ${periode} à signer.`,
      url: "/bulletins-cham",
    }
  );

  return { envoi: { anneeDebut, trimestre, type: typeEffectif, destinataires: profs.length, mails, notifications } };
}
