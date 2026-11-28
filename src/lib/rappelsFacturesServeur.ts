import { db } from "@/lib/db";
import { facturesARappeler } from "@/lib/factures";
import { formaterEuros } from "@/lib/inventaire";
import { envoyerAlerteDirection } from "@/lib/mail";
import { envoyerPush } from "@/lib/push";

// Rappel quotidien (cf. /api/cron/rappels-factures) : un seul mail à la direction, avec une
// notification, qui liste les factures d'achat toujours pas payées 7 jours après leur ajout.
export async function envoyerRappelsFactures(urlBase: string) {
  const maintenant = new Date();
  const impayees = await db.facture.findMany({
    where: { payeeLe: null },
    select: { id: true, date: true, fournisseur: true, montantCentimes: true, objet: true, ajouteLe: true, payeeLe: true, rappelPaiementLe: true },
    orderBy: { date: "asc" },
  });
  const aRappeler = facturesARappeler(impayees, maintenant);
  if (aRappeler.length === 0) return { envoye: false };

  const n = aRappeler.length;
  const ligne = (f: (typeof aRappeler)[number]) =>
    `- ${f.fournisseur}, facture du ${f.date.toLocaleDateString("fr-FR", { timeZone: "UTC" })}` +
    (f.montantCentimes != null ? ` : ${formaterEuros(f.montantCentimes)}` : "") +
    (f.objet ? ` (${f.objet})` : "");
  const url = `${urlBase}/admin/achats`;

  await envoyerAlerteDirection({
    sujet: `Factures d'achat : ${n} à payer`,
    titre: "Factures d'achat à payer",
    texte: `${n > 1 ? "Ces factures ne sont pas encore marquées payées" : "Cette facture n'est pas encore marquée payée"}, plus de 7 jours après leur ajout :\n${aRappeler.map(ligne).join("\n")}\n\nUne fois réglée, cochez « Payée » dans l'appli pour ne plus recevoir ce rappel.`,
    url,
    libelleBouton: "Ouvrir les factures",
  });
  const direction = await db.user.findMany({ where: { role: "ADMIN", actif: true }, select: { id: true } });
  await envoyerPush(
    direction.map((u) => u.id),
    { titre: "Factures à payer", corps: n > 1 ? `${n} factures d'achat ne sont pas encore payées.` : `La facture ${aRappeler[0].fournisseur} n'est pas encore payée.`, url: "/admin/achats" }
  ).catch(() => 0);
  await db.facture.updateMany({ where: { id: { in: aRappeler.map((f) => f.id) } }, data: { rappelPaiementLe: maintenant } });
  return { envoye: true, factures: n };
}
