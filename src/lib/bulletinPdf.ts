import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { decouperLignes, libelleMatiere, libellePeriode, MATIERES_CHAM } from "@/lib/bulletinsCham";
import { LOGO_EMI4M, LOGO_ISERE, LOGO_VERCORS } from "@/lib/bulletinLogos";

export interface PartieProf {
  matiere: string;
  precision: string | null;
  profId: string;
  profNom: string;
  texte: string;
  signature: Uint8Array;
  signeLe: Date;
}

export interface DonneesBulletin {
  eleve: { prenom: string; nom: string };
  anneeDebut: number;
  trimestre: number;
  parties: PartieProf[];
  bilan: { texte: string | null; signature: Uint8Array | null; directionNom: string | null } | null;
}

const LARGEUR = 595.28; // A4
const HAUTEUR = 841.89;
const MARGE = 50;
const LARGEUR_UTILE = LARGEUR - 2 * MARGE;

const ARDOISE = rgb(0.17, 0.24, 0.31);
const GRIS = rgb(0.45, 0.49, 0.53);
const GRIS_CLAIR = rgb(0.82, 0.85, 0.88);

// Le bulletin compilé d'un élève pour un trimestre, à la manière du modèle papier : en-tête
// aux trois logos, une rubrique par matière avec l'appréciation de chaque prof, le bilan de
// la direction, puis toutes les signatures réunies en bas du document.
export async function genererBulletinPdf(donnees: DonneesBulletin): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Bulletin CHAM — ${donnees.eleve.prenom} ${donnees.eleve.nom} — ${libellePeriode(donnees.anneeDebut, donnees.trimestre)}`);
  pdf.setAuthor("EMI4M");

  const normale = await pdf.embedFont(StandardFonts.Helvetica);
  const grasse = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italique = await pdf.embedFont(StandardFonts.HelveticaOblique);

  let page = pdf.addPage([LARGEUR, HAUTEUR]);
  let y = HAUTEUR - MARGE;

  // Saut de page si la hauteur demandée ne tient plus.
  const place = (hauteur: number) => {
    if (y - hauteur < MARGE) {
      page = pdf.addPage([LARGEUR, HAUTEUR]);
      y = HAUTEUR - MARGE;
    }
  };

  const ecrire = (texte: string, opts: { x?: number; taille: number; police: PDFFont; couleur?: ReturnType<typeof rgb>; centre?: boolean }) => {
    const t = nettoyer(texte, opts.police);
    const largeur = opts.police.widthOfTextAtSize(t, opts.taille);
    const x = opts.centre ? (LARGEUR - largeur) / 2 : (opts.x ?? MARGE);
    page.drawText(t, { x, y, size: opts.taille, font: opts.police, color: opts.couleur ?? ARDOISE });
  };

  const paragraphe = (texte: string, taille: number, police: PDFFont, couleur = ARDOISE, retrait = 0) => {
    const interligne = taille * 1.35;
    const lignes = decouperLignes(nettoyer(texte, police), LARGEUR_UTILE - retrait, (t) => police.widthOfTextAtSize(t, taille));
    for (const ligne of lignes) {
      place(interligne);
      y -= interligne;
      if (ligne) page.drawText(ligne, { x: MARGE + retrait, y, size: taille, font: police, color: couleur });
    }
  };

  // --- En-tête ---
  const logos = await Promise.all([LOGO_EMI4M, LOGO_VERCORS, LOGO_ISERE].map((b64) => pdf.embedJpg(copieIndependante(Buffer.from(b64, "base64")))));
  const hauteurLogo = 52;
  const [emi4m, vercors, isere] = logos.map((l) => ({ image: l, largeur: (l.width * hauteurLogo) / l.height }));
  page.drawImage(emi4m.image, { x: MARGE, y: y - hauteurLogo, width: emi4m.largeur, height: hauteurLogo });
  page.drawImage(vercors.image, { x: (LARGEUR - vercors.largeur) / 2, y: y - hauteurLogo, width: vercors.largeur, height: hauteurLogo });
  page.drawImage(isere.image, { x: LARGEUR - MARGE - isere.largeur, y: y - hauteurLogo, width: isere.largeur, height: hauteurLogo });
  y -= hauteurLogo + 34;

  ecrire("BULLETIN CLASSE CHAM", { taille: 20, police: grasse, centre: true });
  y -= 18;
  ecrire(libellePeriode(donnees.anneeDebut, donnees.trimestre), { taille: 11, police: normale, couleur: GRIS, centre: true });
  y -= 30;
  ecrire("Nom :", { taille: 12, police: grasse });
  ecrire(`${donnees.eleve.nom.toUpperCase()} ${donnees.eleve.prenom}`, { x: MARGE + 40, taille: 12, police: normale });
  y -= 10;

  const titreRubrique = (titre: string) => {
    place(40);
    y -= 26;
    ecrire(titre, { taille: 13, police: grasse, centre: true });
    y -= 6;
    page.drawLine({ start: { x: MARGE, y }, end: { x: LARGEUR - MARGE, y }, thickness: 0.6, color: GRIS_CLAIR });
  };

  // --- Rubriques ---
  for (const { valeur } of MATIERES_CHAM) {
    titreRubrique(libelleMatiere(valeur));
    const parties = donnees.parties.filter((p) => p.matiere === valeur);
    if (parties.length === 0) {
      paragraphe("Non renseigné", 9, italique, GRIS);
    }
    for (const p of parties) {
      paragraphe([p.precision, p.profNom].filter(Boolean).join(" — "), 8.5, italique, GRIS);
      paragraphe(p.texte, 10.5, normale);
      y -= 4;
    }
  }

  titreRubrique("Bilan");
  if (donnees.bilan?.texte) paragraphe(donnees.bilan.texte, 10.5, normale);
  else paragraphe("Non renseigné", 9, italique, GRIS);

  // --- Signatures ---
  const embarquer = (png: Uint8Array) => pdf.embedPng(copieIndependante(png));
  const cadre = async (x: number, haut: number, image: PDFImage | null, nom: string, sousTitre: string) => {
    const l = 150;
    const h = 52;
    page.drawRectangle({ x, y: haut - h, width: l, height: h, borderColor: GRIS_CLAIR, borderWidth: 0.6 });
    if (image) {
      const echelle = Math.min((l - 10) / image.width, (h - 8) / image.height);
      const li = image.width * echelle;
      const hi = image.height * echelle;
      page.drawImage(image, { x: x + (l - li) / 2, y: haut - h + (h - hi) / 2, width: li, height: hi });
    }
    page.drawText(nettoyer(nom, grasse), { x, y: haut - h - 11, size: 8.5, font: grasse, color: ARDOISE });
    if (sousTitre) page.drawText(nettoyer(sousTitre, normale), { x, y: haut - h - 21, size: 7.5, font: normale, color: GRIS });
  };

  // Un cadre par prof (sa signature la plus récente), même s'il intervient dans deux rubriques.
  const parProf = new Map<string, PartieProf[]>();
  for (const p of donnees.parties) parProf.set(p.profId, [...(parProf.get(p.profId) ?? []), p]);
  const profs = [...parProf.values()].map((ps) => ps.sort((a, b) => b.signeLe.getTime() - a.signeLe.getTime()));

  place(50);
  y -= 30;
  ecrire("Les professeurs :", { taille: 11, police: grasse });
  y -= 8;
  const parLigne = 3;
  const pas = (LARGEUR_UTILE - 150) / (parLigne - 1);
  for (let i = 0; i < profs.length; i += parLigne) {
    place(90);
    const haut = y;
    for (const [j, ps] of profs.slice(i, i + parLigne).entries()) {
      const matieres = [...new Set(ps.map((p) => p.precision || libelleMatiere(p.matiere)))].join(", ");
      await cadre(MARGE + j * pas, haut, await embarquer(ps[0].signature), ps[0].profNom, matieres);
    }
    y = haut - 90;
  }
  if (profs.length === 0) paragraphe("Aucune signature pour l'instant", 9, italique, GRIS);

  place(95);
  y -= 22;
  ecrire("Le directeur :", { taille: 11, police: grasse });
  y -= 8;
  const signatureDirection = donnees.bilan?.signature ? await embarquer(donnees.bilan.signature) : null;
  await cadre(MARGE, y, signatureDirection, donnees.bilan?.directionNom ?? "", "");

  // Pied de page discret sur chaque page.
  const genere = `Bulletin compilé le ${new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })} — École Musicale Itinérante des 4 Montagnes`;
  for (const p of pdf.getPages()) dessinerPied(p, nettoyer(genere, normale), normale);

  return pdf.save();
}

// pdf-lib lit les images depuis le début de leur zone mémoire (image.buffer), sans tenir
// compte de leur position dans cette zone. Or un Buffer Node ou un champ Bytes de Prisma
// peut n'être qu'une portion d'une zone plus grande : on lui passe donc toujours une copie
// qui commence au début de sa propre zone. (Sans cela : « SOI not found in JPEG ».)
export function copieIndependante(octets: Uint8Array): Uint8Array {
  return Uint8Array.from(octets);
}

function dessinerPied(page: PDFPage, texte: string, police: PDFFont) {
  const taille = 7;
  const largeur = police.widthOfTextAtSize(texte, taille);
  page.drawText(texte, { x: (LARGEUR - largeur) / 2, y: 24, size: taille, font: police, color: GRIS });
}

// Les polices standard du PDF ne savent pas tout écrire (émojis, certains symboles) :
// on remplace ce qui manque plutôt que de faire échouer la génération.
const caracteresParPolice = new WeakMap<PDFFont, Set<number>>();

function nettoyer(texte: string, police: PDFFont): string {
  let jeu = caracteresParPolice.get(police);
  if (!jeu) {
    jeu = new Set(police.getCharacterSet());
    caracteresParPolice.set(police, jeu);
  }
  const remplacements: Record<string, string> = { " ": " ", " ": " ", " ": " ", "‑": "-", "\t": " " };
  let sortie = "";
  for (const c of texte) {
    if (c === "\n") {
      sortie += c;
      continue;
    }
    const r = remplacements[c] ?? c;
    sortie += jeu.has(r.codePointAt(0)!) ? r : "";
  }
  return sortie;
}
