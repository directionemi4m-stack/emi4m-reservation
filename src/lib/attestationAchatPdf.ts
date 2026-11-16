import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { copieIndependante, nettoyer } from "@/lib/bulletinPdf";
import { LOGO_EMI4M } from "@/lib/bulletinLogos";
import { decouperLignes } from "@/lib/bulletinsCham";
import { euros } from "@/lib/devis";
import { montantEnLettres, type LigneAchat } from "@/lib/attestationAchat";
import type { Coordonnees } from "@/lib/programmes";

const L = 595.28;
const H = 841.89;
const M = 40;
const ARDOISE = rgb(0.17, 0.24, 0.31);
const ACCENT = rgb(0.16, 0.5, 0.73);
const GRIS = rgb(0.45, 0.49, 0.53);
const FOND = rgb(0.93, 0.95, 0.97);
const BORD = rgb(0.75, 0.78, 0.82);
const BLANC = rgb(1, 1, 1);
const POINTS = "....................";

export interface AttestationAImprimer {
  numero: string;
  date: Date;
  vendeur: { nom: string; adresse: string | null; telephone: string | null; email: string | null; piece: string | null };
  representant: string | null;
  qualite: string | null;
  faitA: string | null;
  lignes: LigneAchat[];
  paiement: { mode: "VIREMENT" | "CHEQUE" | "ESPECES" | null; reference: string | null; banque: string | null; date: Date | null };
  dateRemise: Date | null;
  suivi: { demandePar: string | null; motif: string | null; affectation: string | null; destination: "ECOLE" | "LOCATION" | null; numeroInventaire: string | null };
  // Signée sur place, au doigt sur le téléphone : les deux signatures et le moment.
  signatures?: { vendeur: Uint8Array; acheteur: Uint8Array; le: Date } | null;
}

const jma = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR", { timeZone: "UTC" }) : "..... / ..... / ..........");

// L'attestation de vente (page 1, à signer par les deux parties) et la fiche interne de suivi
// d'achat (page 2), sur le modèle de l'EMI4M, pré-remplies avec ce qui est connu.
export async function genererAttestationAchat(a: AttestationAImprimer, c: Coordonnees): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Attestation de vente ${a.numero} — ${a.vendeur.nom}`);
  pdf.setAuthor(c.sigle);
  const n = await pdf.embedFont(StandardFonts.Helvetica);
  const g = await pdf.embedFont(StandardFonts.HelveticaBold);
  const i = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const logo = await pdf.embedJpg(copieIndependante(Buffer.from(LOGO_EMI4M, "base64")));
  const total = a.lignes.reduce((s, l) => s + l.prixCentimes, 0);
  const adresseUneLigne = c.adresse.split(/\r?\n/).map((x) => x.trim()).filter(Boolean).join(", ");
  const pied = `${c.sigle}, ${c.nom}, ${adresseUneLigne}${c.siret ? `, SIRET ${c.siret}` : ""}${c.email ? `, ${c.email}` : ""}`;

  const outils = (page: PDFPage) => {
    const t = (s: string, x: number, y: number, taille = 9.5, police: PDFFont = n, couleur = ARDOISE) =>
      page.drawText(nettoyer(s, police), { x, y, size: taille, font: police, color: couleur });
    const lignes = (s: string, largeur: number, police: PDFFont, taille: number) =>
      decouperLignes(nettoyer(s, police), largeur, (x) => police.widthOfTextAtSize(x, taille));
    const case_ = (x: number, y: number, cochee: boolean) => {
      page.drawRectangle({ x, y: y - 1, width: 8, height: 8, borderColor: ARDOISE, borderWidth: 0.7 });
      if (cochee) {
        page.drawLine({ start: { x: x + 1.5, y: y + 3 }, end: { x: x + 3.5, y }, thickness: 1.2, color: ARDOISE });
        page.drawLine({ start: { x: x + 3.5, y }, end: { x: x + 7, y: y + 6 }, thickness: 1.2, color: ARDOISE });
      }
    };
    const titreSection = (s: string, y: number) => {
      t(s, M, y, 11, g, ACCENT);
      page.drawLine({ start: { x: M, y: y - 4 }, end: { x: L - M, y: y - 4 }, thickness: 0.8, color: ACCENT });
    };
    const piedDePage = () => {
      lignes(pied, L - 2 * M, n, 7.5).forEach((l, k) => {
        const w = n.widthOfTextAtSize(l, 7.5);
        page.drawText(l, { x: (L - w) / 2, y: 30 - k * 9, size: 7.5, font: n, color: GRIS });
      });
      page.drawLine({ start: { x: M, y: 42 }, end: { x: L - M, y: 42 }, thickness: 0.5, color: BORD });
    };
    return { t, lignes, case_, titreSection, piedDePage };
  };

  const bandeau = (page: PDFPage, titre: string, img: PDFImage) => {
    page.drawRectangle({ x: M, y: H - M - 62, width: L - 2 * M, height: 62, color: ARDOISE });
    page.drawRectangle({ x: M, y: H - M - 62, width: 70, height: 62, color: BLANC });
    page.drawImage(img, { x: M + 6, y: H - M - 58, width: (img.width * 54) / img.height, height: 54 });
    page.drawText(nettoyer(c.nom, g), { x: M + 82, y: H - M - 24, size: 11, font: g, color: BLANC });
    page.drawText(nettoyer(titre, g), { x: M + 82, y: H - M - 45, size: 15, font: g, color: BLANC });
  };

  // ===== Page 1 : attestation de vente =====
  const p1 = pdf.addPage([L, H]);
  const o = outils(p1);
  bandeau(p1, "ATTESTATION DE VENTE DE MATÉRIEL D'OCCASION", logo);
  let y = H - M - 78;
  o.t("Vente entre un particulier et une association", M, y, 9.5, i, GRIS);
  y -= 14;
  o.t("N° :", M, y, 10, g);
  o.t(a.numero, M + 22, y, 10, n);
  o.t("Date :", M + 120, y, 10, g);
  o.t(jma(a.date), M + 152, y, 10, n);
  y -= 12;

  // Acheteur et vendeur.
  const hBloc = 112;
  p1.drawRectangle({ x: M, y: y - hBloc, width: (L - 2 * M) / 2 - 8, height: hBloc, color: FOND });
  o.t("L'ACHETEUR", M + 6, y - 14, 10, g, ACCENT);
  o.t(`${c.nom} (${c.sigle})`, M + 6, y - 28, 9.5, g);
  o.t("Association loi 1901", M + 6, y - 41);
  o.lignes(adresseUneLigne, (L - 2 * M) / 2 - 20, n, 9.5).slice(0, 2).forEach((l, k) => o.t(l, M + 6, y - 54 - k * 12));
  if (c.siret) o.t(`SIRET ${c.siret}`, M + 6, y - 78);
  o.t(`Représentée par : ${a.representant || POINTS}`, M + 6, y - 94);
  o.t(`En qualité de : ${a.qualite || POINTS}`, M + 6, y - 107);
  const xV = L / 2 + 6;
  o.t("LE VENDEUR (particulier)", xV, y - 14, 10, g, ACCENT);
  const adresseV = (a.vendeur.adresse ?? "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean).join(", ");
  const champsV: [string, string][] = [
    ["Nom, prénom", a.vendeur.nom],
    ["Adresse", adresseV || `${POINTS}${POINTS}`],
    ["Téléphone", a.vendeur.telephone || POINTS],
    ["E-mail", a.vendeur.email || POINTS],
    ["Pièce d'identité (type et n°)", a.vendeur.piece || POINTS],
  ];
  let yV = y - 28;
  for (const [lib, val] of champsV) {
    const morceaux = o.lignes(`${lib} : ${val}`, L / 2 - M - 10, n, 9.5);
    morceaux.slice(0, 2).forEach((l) => {
      o.t(l, xV, yV);
      yV -= 13;
    });
  }
  y -= hBloc + 22;

  // 1. Matériel vendu.
  o.titreSection("1. Matériel vendu", y);
  y -= 12;
  const COL = [150, 112, 98, 82, L - 2 * M - 442];
  const titres = ["Désignation", "Marque / modèle", "N° de série", "État", "Prix (€)"];
  p1.drawRectangle({ x: M, y: y - 14, width: L - 2 * M, height: 14, color: ARDOISE });
  let x = M;
  titres.forEach((tt, k) => {
    if (k === 4) o.t(tt, x + COL[k] - 4 - g.widthOfTextAtSize(tt, 8.5), y - 10, 8.5, g, BLANC);
    else o.t(tt, x + 4, y - 10, 8.5, g, BLANC);
    x += COL[k];
  });
  y -= 14;
  const nbLignes = Math.max(5, a.lignes.length);
  for (let r = 0; r < nbLignes; r++) {
    const l = a.lignes[r];
    const cellules = l ? [l.designation, l.marqueModele ?? "", l.numeroSerie ?? "", l.etat ?? "", euros(l.prixCentimes)] : ["", "", "", "", ""];
    const decoupees = cellules.map((s, k) => o.lignes(s, COL[k] - 8, n, 8.5));
    const h = Math.max(22, Math.max(...decoupees.map((d) => d.length)) * 10 + 8);
    x = M;
    decoupees.forEach((d, k) => {
      p1.drawRectangle({ x, y: y - h, width: COL[k], height: h, borderColor: BORD, borderWidth: 0.5 });
      d.forEach((s, m) => {
        if (k === 4) o.t(s, x + COL[k] - 4 - n.widthOfTextAtSize(s, 8.5), y - 12 - m * 10, 8.5);
        else o.t(s, x + 4, y - 12 - m * 10, 8.5);
      });
      x += COL[k];
    });
    y -= h;
  }
  p1.drawRectangle({ x: M, y: y - 14, width: L - 2 * M - COL[4], height: 14, color: ARDOISE });
  o.t("TOTAL", M + L - 2 * M - COL[4] - 4 - g.widthOfTextAtSize("TOTAL", 9), y - 10.5, 9, g, BLANC);
  p1.drawRectangle({ x: L - M - COL[4], y: y - 14, width: COL[4], height: 14, color: FOND, borderColor: BORD, borderWidth: 0.5 });
  const totalTxt = euros(total);
  o.t(totalTxt, L - M - 4 - g.widthOfTextAtSize(totalTxt, 9), y - 10.5, 9, g);
  y -= 28;
  const enLettres = o.lignes(`Montant total en lettres : ${montantEnLettres(total)}`, L - 2 * M, g, 9.5);
  enLettres.forEach((l, k) => o.t(l, M, y - k * 12, 9.5, k === 0 ? g : n));
  y -= enLettres.length * 12 + 12;

  // 2. Paiement.
  o.titreSection("2. Paiement", y);
  y -= 18;
  o.case_(M, y, a.paiement.mode === "VIREMENT");
  o.t(`Virement bancaire (référence : ${a.paiement.mode === "VIREMENT" && a.paiement.reference ? a.paiement.reference : POINTS})`, M + 12, y);
  o.case_(M + 275, y, a.paiement.mode === "CHEQUE");
  o.t(
    `Chèque n° ${a.paiement.mode === "CHEQUE" && a.paiement.reference ? a.paiement.reference : "............"}   banque : ${a.paiement.mode === "CHEQUE" && a.paiement.banque ? a.paiement.banque : "............"}`,
    M + 287,
    y
  );
  y -= 14;
  o.case_(M, y, a.paiement.mode === "ESPECES");
  o.t("Espèces", M + 12, y);
  y -= 15;
  o.t("Date du paiement :", M, y, 9.5, g);
  o.t(jma(a.paiement.date), M + 92, y);
  o.t("Date de remise du matériel :", M + 210, y, 9.5, g);
  o.t(jma(a.dateRemise), M + 345, y);
  y -= 13;
  o.t("Le transfert de propriété intervient au complet paiement du prix.", M, y, 8.5, i, GRIS);
  y -= 22;

  // 3. Déclarations du vendeur.
  o.titreSection("3. Déclarations du vendeur", y);
  y -= 16;
  o.t("Le vendeur certifie sur l'honneur :", M, y);
  y -= 13;
  for (const puce of [
    "être un particulier agissant à titre privé et non professionnel, dans le cadre d'une vente occasionnelle ;",
    "être le propriétaire légitime du matériel désigné ci-dessus, qui n'est ni volé, ni gagé, ni loué, ni grevé d'aucun droit au profit d'un tiers ;",
    "avoir informé l'acheteur de tout défaut connu du matériel.",
  ]) {
    const l = o.lignes(puce, L - 2 * M - 28, n, 9);
    o.t("•", M + 12, y, 9);
    l.forEach((s, k) => o.t(s, M + 24, y - k * 11, 9));
    y -= l.length * 11 + 2;
  }
  y -= 4;
  o.lignes("L'acheteur reconnaît avoir examiné et, le cas échéant, essayé le matériel, et l'accepte dans l'état décrit ci-dessus.", L - 2 * M, n, 9).forEach((s) => {
    o.t(s, M, y, 9);
    y -= 11;
  });
  y -= 6;
  o.lignes(`Fait à ${a.faitA || POINTS}, le ${jma(a.date)}, en deux exemplaires originaux, un pour chaque partie.`, L - 2 * M, n, 9).forEach((s) => {
    o.t(s, M, y, 9);
    y -= 11;
  });
  y -= 8;
  o.t("Le vendeur", M, y, 10, g);
  o.t("Pour l'EMI4M, l'acheteur", L - M - g.widthOfTextAtSize("Pour l'EMI4M, l'acheteur", 10), y, 10, g);
  y -= 12;
  o.t("Mention « Lu et approuvé, bon pour vente »", M, y, 8, i, GRIS);
  const nq = "Nom, qualité, signature et cachet";
  o.t(nq, L - M - i.widthOfTextAtSize(nq, 8), y, 8, i, GRIS);
  if (a.signatures) {
    const dessiner = async (png: Uint8Array, x: number, droite: boolean) => {
      const image = await pdf.embedPng(copieIndependante(png));
      const echelle = Math.min(170 / image.width, 55 / image.height);
      const w = image.width * echelle;
      p1.drawImage(image, { x: droite ? x - w : x, y: y - 70, width: w, height: image.height * echelle });
    };
    o.t("Lu et approuvé, bon pour vente", M, y - 13, 9, i);
    await dessiner(a.signatures.vendeur, M, false);
    const qui = [a.representant, a.qualite].filter(Boolean).join(", ");
    if (qui) o.t(qui, L - M - n.widthOfTextAtSize(nettoyer(qui, n), 9), y - 13, 9);
    await dessiner(a.signatures.acheteur, L - M, true);
    const le = a.signatures.le.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });
    o.t(`Signée électroniquement par les deux parties le ${le}, sur place, dans l'appli ${c.sigle}.`, M, y - 82, 7.5, i, GRIS);
  }
  o.t("Pièce à joindre : copie de la pièce d'identité du vendeur (conservée uniquement comme justificatif comptable de l'achat).", M, 58, 7.5, i, GRIS);
  o.piedDePage();

  // ===== Page 2 : fiche interne de suivi d'achat =====
  const p2 = pdf.addPage([L, H]);
  const o2 = outils(p2);
  bandeau(p2, "FICHE INTERNE DE SUIVI D'ACHAT", logo);
  y = H - M - 78;
  o2.t("Document interne, à agrafer à l'attestation de vente et à transmettre à la comptabilité", M, y, 9.5, i, GRIS);
  y -= 15;
  o2.t("Attestation n° :", M, y, 10, g);
  o2.t(a.numero, M + 82, y, 10);
  y -= 24;
  const tableau = (lignesT: [string, string | ((x: number, yy: number) => void)][]) => {
    for (const [lib, val] of lignesT) {
      p2.drawRectangle({ x: M, y: y - 22, width: 180, height: 22, color: FOND, borderColor: BORD, borderWidth: 0.5 });
      p2.drawRectangle({ x: M + 180, y: y - 22, width: L - 2 * M - 180, height: 22, borderColor: BORD, borderWidth: 0.5 });
      o2.t(lib, M + 6, y - 14, 9, g);
      if (typeof val === "string") o2.lignes(val, L - 2 * M - 192, n, 9).slice(0, 1).forEach((s) => o2.t(s, M + 186, y - 14, 9));
      else val(M + 186, y - 14);
      y -= 22;
    }
    y -= 18;
  };
  const cases = (choix: [string, boolean][]) => (x0: number, yy: number) => {
    let xx = x0;
    for (const [lib, ok] of choix) {
      o2.case_(xx, yy, ok);
      o2.t(lib, xx + 12, yy, 9);
      xx += 22 + n.widthOfTextAtSize(lib, 9);
    }
  };
  o2.titreSection("1. Demande et validation", y);
  y -= 12;
  tableau([
    ["Demandé par", a.suivi.demandePar ?? ""],
    ["Motif / usage prévu", a.suivi.motif ?? ""],
    ["Discipline / site concerné", a.suivi.affectation ?? ""],
    ["Montant prévu (€)", euros(total)],
    ["Ligne budgétaire", ""],
    ["Validé par (nom, qualité)", ""],
    ["Date et signature de validation", ""],
  ]);
  o2.titreSection("2. Paiement", y);
  y -= 12;
  tableau([
    ["Mode de paiement", cases([["Virement", a.paiement.mode === "VIREMENT"], ["Chèque", a.paiement.mode === "CHEQUE"], ["Espèces", a.paiement.mode === "ESPECES"]])],
    ["Référence (n° chèque / virement)", a.paiement.reference ?? ""],
    ["Date de paiement", a.paiement.date ? jma(a.paiement.date) : ""],
    ["Saisi en comptabilité le / par", ""],
  ]);
  o2.titreSection("3. Entrée à l'inventaire", y);
  y -= 12;
  tableau([
    ["N° d'inventaire attribué", a.suivi.numeroInventaire ?? ""],
    ["Affectation (site, salle)", a.suivi.affectation ?? ""],
    ["Destination", cases([["Usage école", a.suivi.destination === "ECOLE"], ["Parc de location aux élèves", a.suivi.destination === "LOCATION"]])],
    ["Marquage / étiquette posée", cases([["Oui", false], ["Non", false]])],
    ["Assurance informée", (x0, yy) => {
      cases([["Oui", false], ["Non", false]])(x0, yy);
      o2.t("Date : ...........................", x0 + 90, yy, 9);
    }],
  ]);
  o2.titreSection("4. Pièces du dossier", y);
  y -= 18;
  for (const piece of [
    "Attestation de vente signée par les deux parties (original)",
    "Copie de la pièce d'identité du vendeur",
    "Photo(s) du matériel et du numéro de série",
    "Preuve de paiement (talon de chèque ou avis de virement)",
    "Annonce d'origine (capture d'écran), le cas échéant",
  ]) {
    o2.case_(M, y, false);
    o2.t(piece, M + 12, y, 9);
    y -= 15;
  }
  o2.piedDePage();
  return pdf.save();
}
