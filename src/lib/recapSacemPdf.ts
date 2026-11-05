import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { copieIndependante, nettoyer } from "@/lib/bulletinPdf";
import { LOGO_EMI4M } from "@/lib/bulletinLogos";
import { decouperLignes } from "@/lib/bulletinsCham";
import { minutesVersHeure } from "@/lib/agenda";
import { formaterMinutage, libelleLieu, libelleTypeEvenement } from "@/lib/saison";
import type { Coordonnees } from "@/lib/programmes";

export interface EvenementReleve {
  titre: string;
  type: string;
  date: Date;
  heureDebutMinutes: number | null;
  commune: string | null;
  lieuPrecis: string | null;
  passages: {
    interpretes: string; // « Léa MARTIN (violon) »
    morceaux: { titre: string; compositeur: string; arrangeur: string | null; dureeSecondes: number }[];
    programmeLibre: string; // ancien programme sans détail des œuvres
  }[];
}

const LARGEUR = 595.28;
const HAUTEUR = 841.89;
const MARGE = 40;
const ARDOISE = rgb(0.17, 0.24, 0.31);
const GRIS = rgb(0.45, 0.49, 0.53);
const BORD = rgb(0.8, 0.82, 0.86);
const FOND = rgb(0.93, 0.95, 0.97);
const BLANC = rgb(1, 1, 1);
// Titre de l'œuvre, compositeur, arrangeur, interprètes, durée (515 pt au total).
const COLONNES = [160, 112, 82, 116, 45];
const TITRES_COLONNES = ["Titre de l'œuvre", "Compositeur", "Arrangeur", "Interprète(s)", "Durée"];
const TAILLE = 8.5;
const INTERLIGNE = 10.5;

const dateLongue = (d: Date) =>
  d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const dateCourte = (d: Date) => d.toLocaleDateString("fr-FR", { timeZone: "UTC" });

// Le relevé des programmes à transmettre à la SACEM : en-tête avec les coordonnées de
// l'école, puis chaque représentation (date, lieu) et ses œuvres (titre, compositeur,
// arrangeur, interprètes, durée), et l'attestation finale.
export async function genererReleveSacem(params: {
  coordonnees: Coordonnees;
  debut: Date;
  finIncluse: Date;
  evenements: EvenementReleve[];
}): Promise<Uint8Array> {
  const { coordonnees: c, debut, finIncluse, evenements } = params;
  const periode = `du ${dateCourte(debut)} au ${dateCourte(finIncluse)}`;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Relevé des programmes ${periode} — ${c.sigle}`);
  pdf.setAuthor(c.sigle);
  const normale = await pdf.embedFont(StandardFonts.Helvetica);
  const grasse = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italique = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const logo = await pdf.embedJpg(copieIndependante(Buffer.from(LOGO_EMI4M, "base64")));

  const texte = (page: PDFPage, t: string, x: number, y: number, taille: number, police: PDFFont, couleur = ARDOISE) =>
    page.drawText(nettoyer(t, police), { x, y, size: taille, font: police, color: couleur });
  const lignesDe = (t: string, largeur: number, police: PDFFont, taille = TAILLE) =>
    decouperLignes(nettoyer(t, police), largeur, (s) => police.widthOfTextAtSize(s, taille));

  let page = pdf.addPage([LARGEUR, HAUTEUR]);
  let y = HAUTEUR - MARGE;
  const nouvellePage = () => {
    page = pdf.addPage([LARGEUR, HAUTEUR]);
    y = HAUTEUR - MARGE;
  };
  const place = (hauteur: number) => {
    if (y - hauteur < MARGE + 24) {
      nouvellePage();
      return true;
    }
    return false;
  };

  // En-tête : logo, titre, coordonnées de l'école.
  page.drawImage(logo, { x: MARGE, y: y - 54, width: (logo.width * 54) / logo.height, height: 54 });
  texte(page, `${c.sigle} · ${c.nom}`, MARGE + 66, y - 14, 9, grasse, GRIS);
  texte(page, "Relevé des programmes", MARGE + 66, y - 34, 18, grasse);
  texte(page, `Œuvres interprétées ${periode}`, MARGE + 66, y - 50, 10.5, normale, GRIS);
  y -= 72;

  const infos = [
    ...c.adresse.split(/\r?\n/).map((l) => l.trim()).filter(Boolean),
    [c.telephone && `Tél. ${c.telephone}`, c.email].filter(Boolean).join(" · "),
    c.siteWeb ?? "",
  ].filter(Boolean);
  const officiel = [
    c.siret && `SIRET : ${c.siret}`,
    c.numeroSacem && `N° client SACEM : ${c.numeroSacem}`,
    c.representant && `Représentant : ${c.representant}`,
  ].filter(Boolean) as string[];
  const hauteurBloc = Math.max(infos.length, officiel.length + 1) * 12 + 14;
  page.drawRectangle({ x: MARGE, y: y - hauteurBloc, width: LARGEUR - 2 * MARGE, height: hauteurBloc, color: FOND });
  infos.forEach((l, i) => texte(page, l, MARGE + 10, y - 16 - i * 12, 9, i === 0 ? grasse : normale));
  const nbOeuvres = evenements.reduce((n, e) => n + e.passages.reduce((m, p) => m + Math.max(p.morceaux.length, 1), 0), 0);
  [...officiel, `${evenements.length} représentation${evenements.length > 1 ? "s" : ""} · ${nbOeuvres} œuvre${nbOeuvres > 1 ? "s" : ""}`].forEach(
    (l, i) => texte(page, l, MARGE + 290, y - 16 - i * 12, 9, normale)
  );
  y -= hauteurBloc + 18;

  const enteteTableau = () => {
    page.drawRectangle({ x: MARGE, y: y - 16, width: LARGEUR - 2 * MARGE, height: 16, color: ARDOISE });
    let x = MARGE;
    TITRES_COLONNES.forEach((t, i) => {
      texte(page, t, x + 4, y - 11.5, 8, grasse, BLANC);
      x += COLONNES[i];
    });
    y -= 16;
  };

  if (evenements.length === 0) {
    texte(page, "Aucune représentation sur cette période.", MARGE, y, 10, italique, GRIS);
  }

  for (const e of evenements) {
    // Bandeau de la représentation (gardé avec au moins une ligne du tableau).
    const lieu = libelleLieu(e.commune ?? undefined, e.lieuPrecis) || "Lieu non précisé";
    place(34 + 16 + 24);
    texte(page, `${dateLongue(e.date)}${e.heureDebutMinutes !== null ? ` à ${minutesVersHeure(e.heureDebutMinutes)}` : ""}`.replace(/^./, (l) => l.toUpperCase()), MARGE, y - 11, 10.5, grasse);
    texte(page, `${e.titre} (${libelleTypeEvenement(e.type).toLowerCase()}) · ${lieu}`, MARGE, y - 24, 9, normale, GRIS);
    y -= 32;
    enteteTableau();

    const lignes = e.passages.flatMap((p) =>
      p.morceaux.length > 0
        ? p.morceaux.map((m) => [m.titre, m.compositeur, m.arrangeur ?? "", p.interpretes, formaterMinutage(m.dureeSecondes)])
        : [[p.programmeLibre || "Programme non détaillé", "", "", p.interpretes, ""]]
    );
    if (lignes.length === 0) {
      place(20);
      texte(page, "Programme non renseigné.", MARGE + 4, y - 12, TAILLE, italique, GRIS);
      y -= 20;
    }
    let total = 0;
    e.passages.forEach((p) => p.morceaux.forEach((m) => (total += m.dureeSecondes)));
    for (const ligne of lignes) {
      const cellules = ligne.map((t, i) => lignesDe(t, COLONNES[i] - 8, i === 0 ? italique : normale));
      const hauteur = Math.max(...cellules.map((l) => l.length)) * INTERLIGNE + 6;
      if (place(hauteur)) enteteTableau();
      let x = MARGE;
      cellules.forEach((l, i) => {
        page.drawRectangle({ x, y: y - hauteur, width: COLONNES[i], height: hauteur, borderColor: BORD, borderWidth: 0.5 });
        l.forEach((t, k) => texte(page, t, x + 4, y - 10 - k * INTERLIGNE, TAILLE, i === 0 ? italique : normale));
        x += COLONNES[i];
      });
      y -= hauteur;
    }
    if (total > 0) {
      const t = `Durée totale des œuvres : ${formaterMinutage(total)}`;
      texte(page, t, LARGEUR - MARGE - normale.widthOfTextAtSize(t, 8), y - 11, 8, normale, GRIS);
      y -= 14;
    }
    y -= 14;
  }

  // Attestation.
  place(60);
  y -= 6;
  texte(page, `Relevé établi d'après les programmes saisis par les professeurs dans l'appli ${c.sigle}.`, MARGE, y, 9, normale, GRIS);
  texte(page, `Certifié exact, le ${new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}${c.representant ? `, par ${c.representant}` : ""}.`, MARGE, y - 14, 9, normale);
  texte(page, "Signature :", MARGE + 330, y - 14, 9, normale);

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    const pied = `${c.sigle} — Relevé des programmes ${periode} · page ${i + 1}/${pages.length}`;
    const l = normale.widthOfTextAtSize(nettoyer(pied, normale), 7.5);
    p.drawText(nettoyer(pied, normale), { x: (LARGEUR - l) / 2, y: 20, size: 7.5, font: normale, color: GRIS });
  });
  return pdf.save();
}
