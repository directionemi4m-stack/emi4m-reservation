import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { PropositionFacture } from "@/lib/factures";

// Lecture d'une facture (photos du papier ou PDF, scanné ou non) par Claude, pour proposer
// la date, l'entreprise, le montant et l'objet. Ce n'est qu'une proposition : la direction
// valide ou corrige avant l'archivage.

export function lectureClaudeDisponible(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SchemaFacture = z.object({
  date: z.string().nullable().describe("Date d'émission de la facture au format AAAA-MM-JJ, ou null si illisible."),
  fournisseur: z
    .string()
    .nullable()
    .describe("Nom commercial court de l'entreprise qui a émis la facture (sans forme juridique SAS, SARL…), ou null."),
  montant_ttc: z.number().nullable().describe("Montant total TTC à payer, en euros (ex. 49.8), ou null."),
  objet: z.string().nullable().describe("Ce qui a été acheté, en quelques mots (ex. « cordes de violon »), ou null."),
});

const CONSIGNE = `Tu lis une facture d'achat d'une école de musique (France). Extrais :
- la date d'émission de la facture (pas la date d'échéance ni de livraison) ;
- le nom de l'entreprise qui a émis la facture (le vendeur, jamais l'école cliente « EMI4M » ou « École Musicale Itinérante des 4 Montagnes ») ;
- le montant total TTC payé ;
- l'objet de l'achat en quelques mots, en français.
Si une information est absente ou illisible, mets null plutôt que de deviner.`;

let client: Anthropic | null = null;

export async function lireFactureAvecClaude(
  fichier: { type: "pdf"; contenu: Uint8Array } | { type: "photos"; pages: Uint8Array[] },
  fournisseursConnus: string[]
): Promise<(PropositionFacture & { objet: string | null }) | null> {
  if (!lectureClaudeDisponible()) return null;
  client ??= new Anthropic({ timeout: 60_000, maxRetries: 1 });

  const pieces: Anthropic.Beta.BetaContentBlockParam[] =
    fichier.type === "pdf"
      ? [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: Buffer.from(fichier.contenu).toString("base64") },
          },
        ]
      : fichier.pages.slice(0, 6).map((page) => ({
          type: "image" as const,
          source: { type: "base64" as const, media_type: "image/jpeg" as const, data: Buffer.from(page).toString("base64") },
        }));

  const connus = fournisseursConnus.length
    ? `\nEntreprises déjà connues de l'école (reprends exactement l'un de ces noms si c'est la même entreprise) : ${fournisseursConnus.join(" ; ")}.`
    : "";

  const reponse = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 2000,
    // Repli automatique sur un autre modèle si la requête est déclinée par un filtre de sécurité.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(SchemaFacture) },
    messages: [{ role: "user", content: [...pieces, { type: "text", text: CONSIGNE + connus }] }],
  });

  if (reponse.stop_reason === "refusal" || !reponse.parsed_output) return null;
  const { date, fournisseur, montant_ttc, objet } = reponse.parsed_output;
  return {
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    fournisseur: fournisseur?.trim() || null,
    montantCentimes: montant_ttc != null && montant_ttc > 0 ? Math.round(montant_ttc * 100) : null,
    objet: objet?.trim() || null,
  };
}
