import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { ACCES, type Quantites } from "@/lib/cles";
import { copieIndependante, nettoyer } from "@/lib/bulletinPdf";
import { LOGO_EMI4M } from "@/lib/bulletinLogos";

export interface LigneRegistre extends Quantites {
  prof: string; // « Jeanne Rival »
  remiseLe: Date | null; // null : salarié sans remise cette saison (ligne vide, comme sur le papier)
  signatureRemise: Uint8Array | null;
  signatureDirectionRemise: Uint8Array | null;
  restitueLe: Date | null;
  signatureRestitution: Uint8Array | null;
  signatureDirectionRestitution: Uint8Array | null;
  restitutionPapier: boolean;
}

const LARGEUR = 595.28;
const HAUTEUR = 841.89;
const MARGE = 40;
const ARDOISE = rgb(0.17, 0.24, 0.31);
const GRIS = rgb(0.45, 0.49, 0.53);
const BORD = rgb(0.75, 0.78, 0.82);
const COLONNES = [118, 40, 40, 40, 138, 139]; // professeur, 3 accès, remise, restitution
const HAUT_LIGNE = 44;
const HAUT_ENTETE = 30;

const dateFr = (d: Date) => d.toLocaleDateString("fr-FR", { timeZone: "UTC" });

// Le registre « Remise et restitution des clés et badges » d'une saison, sur le modèle du
// registre papier : une ligne par remise, avec la signature du salarié et celle de la
// direction à la remise et à la restitution, et la signature du responsable en bas.
export async function genererRegistreCles(params: {
  saison: string; // « 2026-2027 »
  lignes: LigneRegistre[];
  responsable: { nom: string; signature: Uint8Array | null };
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Remise et restitution des clés et badges — ${params.saison}`);
  pdf.setAuthor("EMI4M");
  const normale = await pdf.embedFont(StandardFonts.Helvetica);
  const grasse = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedJpg(copieIndependante(Buffer.from(LOGO_EMI4M, "base64")));

  const texte = (page: PDFPage, t: string, x: number, y: number, taille: number, police: PDFFont, couleur = ARDOISE) =>
    page.drawText(nettoyer(t, police), { x, y, size: taille, font: police, color: couleur });

  let page = pdf.addPage([LARGEUR, HAUTEUR]);
  let y = HAUTEUR - MARGE;

  // En-tête de la première page.
  page.drawImage(logo, { x: MARGE, y: y - 50, width: (logo.width * 50) / logo.height, height: 50 });
  texte(page, "EMI4M · École Musicale Itinérante des 4 Montagnes", MARGE + 62, y - 14, 9, grasse, GRIS);
  texte(page, "Remise et restitution des clés et badges", MARGE + 62, y - 34, 18, grasse);
  y -= 70;
  texte(page, `Saison ${params.saison} — registre de remise, de restitution et de signature`, MARGE, y, 11, normale, GRIS);
  y -= 10;
  page.drawLine({ start: { x: MARGE, y }, end: { x: LARGEUR - MARGE, y }, thickness: 1, color: ARDOISE });
  y -= 16;
  texte(page, "Autrans / Méaudre : clés des locaux · Lans : badge (le Cairn) · Villard : clés (salle Lodéon).", MARGE, y, 8.5, normale, GRIS);
  y -= 14;

  const enteteTableau = () => {
    let x = MARGE;
    const titres = ["Professeur", ...ACCES.map((a) => a.court), "Remise — date & signature", "Restitution — date & signature"];
    page.drawRectangle({ x: MARGE, y: y - HAUT_ENTETE, width: LARGEUR - 2 * MARGE, height: HAUT_ENTETE, color: ARDOISE });
    titres.forEach((t, i) => {
      const mots = t.split(" ");
      const l1 = i >= 1 && i <= 3 ? mots[0] : t;
      const l2 = i >= 1 && i <= 3 ? mots.slice(1).join(" ") : "";
      texte(page, l1, x + 4, y - (l2 ? 12 : 18), 8.5, grasse, rgb(1, 1, 1));
      if (l2) texte(page, l2, x + 4, y - 23, 8.5, grasse, rgb(1, 1, 1));
      x += COLONNES[i];
    });
    y -= HAUT_ENTETE;
  };
  enteteTableau();

  const signatureDans = async (png: Uint8Array, x: number, bas: number, largeurMax: number, hauteurMax: number) => {
    const image = await pdf.embedPng(copieIndependante(png));
    const echelle = Math.min(largeurMax / image.width, hauteurMax / image.height);
    page.drawImage(image, { x, y: bas, width: image.width * echelle, height: image.height * echelle });
  };

  // Une case « date & signature » : salarié à gauche, direction à droite, légendées.
  const caseSignee = async (x: number, haut: number, salarie: Uint8Array | null, direction: Uint8Array | null) => {
    if (salarie) await signatureDans(salarie, x + 4, haut - 36, 78, 22);
    if (direction) await signatureDans(direction, x + 88, haut - 36, 46, 22);
    if (salarie || direction) {
      texte(page, "salarié", x + 4, haut - 42, 5.5, normale, GRIS);
      if (direction) texte(page, "direction", x + 88, haut - 42, 5.5, normale, GRIS);
    }
  };

  for (const l of params.lignes) {
    if (y - HAUT_LIGNE < MARGE + 40) {
      page = pdf.addPage([LARGEUR, HAUTEUR]);
      y = HAUTEUR - MARGE;
      enteteTableau();
    }
    const haut = y;
    let x = MARGE;
    // Cadres de la ligne.
    COLONNES.forEach((largeur) => {
      page.drawRectangle({ x, y: haut - HAUT_LIGNE, width: largeur, height: HAUT_LIGNE, borderColor: BORD, borderWidth: 0.6 });
      x += largeur;
    });
    // Professeur (sur deux lignes si besoin).
    const [prenom, ...reste] = l.prof.split(" ");
    const nomLong = normale.widthOfTextAtSize(l.prof, 10) > COLONNES[0] - 8;
    texte(page, nomLong ? prenom : l.prof, MARGE + 4, haut - (nomLong ? 18 : 25), 10, grasse);
    if (nomLong) texte(page, reste.join(" "), MARGE + 4, haut - 31, 10, grasse);
    // Accès : nombre remis, ou un tiret.
    x = MARGE + COLONNES[0];
    ACCES.forEach((a, i) => {
      const n = l[a.champ];
      const t = l.remiseLe ? (n > 0 ? String(n) : "—") : "";
      const largeur = grasse.widthOfTextAtSize(t, 11);
      texte(page, t, x + (COLONNES[i + 1] - largeur) / 2, haut - 26, 11, n > 0 ? grasse : normale, n > 0 ? ARDOISE : GRIS);
      x += COLONNES[i + 1];
    });
    // Remise.
    const xRemise = MARGE + COLONNES.slice(0, 4).reduce((s, c) => s + c, 0);
    texte(page, `Date : ${l.remiseLe ? dateFr(l.remiseLe) : "…… / …… / ……"}`, xRemise + 4, haut - 11, 8, normale, GRIS);
    if (l.signatureRemise) await caseSignee(xRemise, haut, l.signatureRemise, l.signatureDirectionRemise);
    else if (l.remiseLe) texte(page, "Signé sur le registre papier", xRemise + 4, haut - 30, 8, normale, GRIS);
    // Restitution.
    const xRestit = xRemise + COLONNES[4];
    texte(page, `Date : ${l.restitueLe ? dateFr(l.restitueLe) : "…… / …… / ……"}`, xRestit + 4, haut - 11, 8, normale, GRIS);
    if (l.signatureRestitution) await caseSignee(xRestit, haut, l.signatureRestitution, l.signatureDirectionRestitution);
    else if (l.restitueLe && l.restitutionPapier) texte(page, "Signé sur le registre papier", xRestit + 4, haut - 30, 8, normale, GRIS);
    y -= HAUT_LIGNE;
  }

  // Le responsable signe sous le tableau, tant que ça tient au-dessus du pied de page.
  const hauteurBas = params.responsable.signature ? 62 : 28;
  if (y - hauteurBas < MARGE) {
    page = pdf.addPage([LARGEUR, HAUTEUR]);
    y = HAUTEUR - MARGE;
  }
  y -= 24;
  texte(page, `Responsable du registre : ${params.responsable.nom}`, MARGE, y, 10, normale);
  texte(page, `Édité le ${new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}`, MARGE, y - 14, 9, normale, GRIS);
  if (params.responsable.signature) {
    texte(page, "Signature :", MARGE + 250, y, 10, normale);
    await signatureDans(params.responsable.signature, MARGE + 305, y - 30, 120, 40);
  }

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    const pied = `EMI4M — Remise et restitution des clés et badges ${params.saison} · page ${i + 1}/${pages.length}`;
    const l = normale.widthOfTextAtSize(pied, 7.5);
    p.drawText(nettoyer(pied, normale), { x: (LARGEUR - l) / 2, y: 20, size: 7.5, font: normale, color: GRIS });
  });
  return pdf.save();
}
