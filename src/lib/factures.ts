// Factures d'achat : nommage des fichiers et lecture du texte d'une facture PDF pour
// proposer date, entreprise et montant. Logique pure, testée dans factures.test.ts.

const INTERDITS = /[\\/:*?"<>|\u0000-\u001f]/g;

// « 2026-10-28_Thomann.pdf » : année-mois-jour_entreprise, comme demandé pour l'archive.
export function nomFichierFacture(date: string, entreprise: string): string {
  const e = entreprise.replace(INTERDITS, " ").replace(/\s+/g, " ").trim() || "Entreprise";
  return `${date}_${e}.pdf`;
}

// Nom saisi ou corrigé à la main : caractères interdits retirés, toujours en .pdf.
export function normaliserNomFichier(saisie: string): string {
  const base = saisie
    .replace(/\.pdf$/i, "")
    .replace(INTERDITS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);
  return `${base || "Facture"}.pdf`;
}

// Retrouve date et entreprise dans un nom au format « 2026-10-28_Thomann.pdf », pour classer
// la facture (année du dossier, liste) sans avoir à les saisir à part. Un nom libre donne
// une date nulle et l'entreprise = le nom sans extension.
export function lireNomFacture(nom: string): { date: string | null; fournisseur: string | null } {
  const base = nom.replace(/\.pdf$/i, "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[_\s-]+(.*))?$/.exec(base);
  if (m) {
    const date = iso(Number(m[1]), Number(m[2]), Number(m[3]));
    if (date) return { date, fournisseur: m[4]?.trim() || null };
  }
  return { date: null, fournisseur: base || null };
}

const MOIS: Record<string, number> = {
  janvier: 1, janv: 1, jan: 1,
  fevrier: 2, fevr: 2, fev: 2,
  mars: 3, mar: 3,
  avril: 4, avr: 4,
  mai: 5,
  juin: 6,
  juillet: 7, juil: 7,
  aout: 8,
  septembre: 9, sept: 9, sep: 9,
  octobre: 10, oct: 10,
  novembre: 11, nov: 11,
  decembre: 12, dec: 12,
};

const sansAccents = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");

function iso(a: number, m: number, j: number): string | null {
  if (a < 100) a += 2000;
  const d = new Date(Date.UTC(a, m - 1, j));
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== j) return null;
  return d.toISOString().slice(0, 10);
}

// Toutes les dates d'une ligne, dans l'ordre : 28/10/2026, 28-10-26, 28.10.2026,
// 2026-10-28, 28 octobre 2026, 28 oct. 2026.
function datesDe(ligne: string): string[] {
  const t = sansAccents(ligne.toLowerCase());
  const trouvees: { pos: number; date: string }[] = [];
  for (const m of t.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/g)) {
    const d = iso(Number(m[3]), Number(m[2]), Number(m[1]));
    if (d) trouvees.push({ pos: m.index!, date: d });
  }
  for (const m of t.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    const d = iso(Number(m[1]), Number(m[2]), Number(m[3]));
    if (d) trouvees.push({ pos: m.index!, date: d });
  }
  for (const m of t.matchAll(/\b(\d{1,2})(?:er)?\s+([a-z]{3,9})\.?\s+(\d{4})\b/g)) {
    const mois = MOIS[m[2]];
    const d = mois ? iso(Number(m[3]), mois, Number(m[1])) : null;
    if (d) trouvees.push({ pos: m.index!, date: d });
  }
  return trouvees.sort((a, b) => a.pos - b.pos).map((x) => x.date);
}

// « 1 250,00 », « 1.250,00 », « 1250.00 », « 1 250 » → centimes.
function lireMontant(t: string): number | null {
  const m = /(\d{1,3}(?:[ .  ]\d{3})+|\d+)(?:[.,](\d{2}))?/.exec(t);
  if (!m) return null;
  return Number(m[1].replace(/[ .  ]/g, "")) * 100 + Number(m[2] ?? 0);
}

const MOTS_ENTETE = /^(facture|invoice|devis|bon de|page|date|n°|no\b|numero|client|adresse|tel|t[ée]l[ée]phone|mail|e-mail|www\.|http|siret|siren|tva|rcs|capital|iban|bic|total|montant|qt[ée]|d[ée]signation)/i;

export interface PropositionFacture {
  date: string | null; // AAAA-MM-JJ
  fournisseur: string | null;
  montantCentimes: number | null;
}

// Propose date, entreprise et montant à partir du texte d'une facture PDF. Ce n'est qu'une
// proposition : la direction valide ou corrige avant l'enregistrement.
export function devinerFacture(texte: string, fournisseursConnus: string[], aujourdHui: Date): PropositionFacture {
  const lignes = texte
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const limiteHaute = new Date(aujourdHui.getTime() + 31 * 86_400_000).toISOString().slice(0, 10);
  const plausible = (d: string) => d >= "2000-01-01" && d <= limiteHaute;

  // Date : de préférence sur une ligne qui parle de la date de facture, sinon la première
  // date plausible du document (l'échéance vient en général après).
  let date: string | null = null;
  for (const l of lignes) {
    if (/date (de (la )?)?facture|facture (du|n°.* du)|date d['’]?[ée]mission|invoice date|date\s*:/i.test(l)) {
      date = datesDe(l).find(plausible) ?? null;
      if (date) break;
    }
  }
  date ??= lignes.flatMap(datesDe).find(plausible) ?? null;

  // Entreprise : d'abord une entreprise déjà connue citée dans le document (la plus longue
  // l'emporte), sinon une des premières lignes qui ressemble à un nom de société.
  const texteSansAccents = sansAccents(texte.toLowerCase());
  let fournisseur =
    [...fournisseursConnus]
      .sort((a, b) => b.length - a.length)
      .find((f) => f.trim().length >= 3 && texteSansAccents.includes(sansAccents(f.toLowerCase()))) ?? null;
  if (!fournisseur) {
    const forme = lignes.slice(0, 25).find((l) => /\b(SAS|SARL|SASU|EURL|SA|SCOP|GmbH|Ltd)\b/.test(l) && l.length <= 60);
    const candidate =
      forme ??
      lignes
        .slice(0, 8)
        .find((l) => /[a-z]{3}/i.test(l) && l.length <= 40 && !MOTS_ENTETE.test(l) && !/\d{4,}/.test(l) && datesDe(l).length === 0);
    fournisseur = candidate?.replace(/\b(SAS|SARL|SASU|EURL|SA|SCOP)\b\.?/g, "").replace(/[,\-–]+\s*$/, "").trim() || null;
  }

  // Montant : la ligne « Total TTC », « Net à payer », « Montant TTC »… (la dernière, qui
  // est en général le total final).
  let montantCentimes: number | null = null;
  for (const l of lignes) {
    if (/total\s*t\.?t\.?c|net [àa] payer|montant\s*t\.?t\.?c|total [àa] payer|total\s*:/i.test(l)) {
      const apres = l.replace(/^.*?(ttc|payer|total)\s*:?/i, "");
      const m = lireMontant(apres);
      if (m !== null && m > 0) montantCentimes = m;
    }
  }

  return { date, fournisseur, montantCentimes };
}
