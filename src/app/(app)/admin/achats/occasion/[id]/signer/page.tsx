import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chargerAttestation } from "@/lib/attestationAchatServeur";
import { LIBELLE_PAIEMENT, montantEnLettres } from "@/lib/attestationAchat";
import { signatureEnDataUrl } from "@/lib/bulletinsCham";
import { lireCoordonnees } from "@/lib/coordonneesServeur";
import { euros } from "@/lib/devis";
import { SignatureSurPlace } from "@/components/achats/SignatureSurPlace";

const jma = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR", { timeZone: "UTC" }) : "—");

// Écran à montrer au vendeur sur le téléphone : il relit l'attestation et signe au doigt.
export default async function SignerAttestationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const [a, coordonnees, signature] = await Promise.all([
    chargerAttestation(id),
    lireCoordonnees(),
    db.signatureBulletin.findUnique({ where: { userId: session!.user.id } }),
  ]);
  if (!a) notFound();
  const total = a.lignes.reduce((s, l) => s + l.prixCentimes, 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={`/admin/achats/occasion/${a.id}`} className="text-sm text-brand-accent hover:underline">
          ‹ Attestation {a.numero}
        </Link>
        <h2 className="mt-1 text-lg font-semibold text-brand-slate">Attestation de vente de matériel d&apos;occasion</h2>
        <p className="text-sm text-slate-500">
          N° {a.numero} du {jma(a.date)}
          {a.faitA && `, à ${a.faitA}`}
        </p>
        <a href="#signatures" className="mt-2 block rounded-md bg-brand-accent/10 p-2 text-sm font-medium text-brand-accent">
          ✍️ Donnez le téléphone au vendeur : il relit ci-dessous, puis signe au doigt en bas de la page ↓
        </a>
      </div>

      {a.signeSurPlaceLe && (
        <p className="rounded-md bg-status-attente/10 p-2 text-sm text-slate-700">
          Déjà signée sur place le {a.signeSurPlaceLe.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" })} : signer à nouveau
          remplace les signatures.
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-lg bg-white p-4 text-sm shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-brand-accent">L&apos;ACHETEUR</p>
            <p className="font-medium text-slate-800">
              {coordonnees.nom} ({coordonnees.sigle})
            </p>
            <p className="text-slate-600">
              Association loi 1901{coordonnees.siret && ` · SIRET ${coordonnees.siret}`}
              {a.representant && (
                <span className="block">
                  Représentée par {a.representant}
                  {a.qualite && `, ${a.qualite}`}
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-brand-accent">LE VENDEUR (particulier)</p>
            <p className="whitespace-pre-line text-slate-700">{[a.vendeurNom, a.vendeurAdresse, a.vendeurTelephone, a.vendeurEmail, a.vendeurPiece].filter(Boolean).join("\n")}</p>
          </div>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {a.lignes.map((l) => (
              <tr key={l.id} className="border-b border-slate-100 align-top">
                <td className="py-1.5 pr-2 text-slate-800">
                  {l.designation}
                  <span className="block text-xs text-slate-500">{[l.marqueModele, l.numeroSerie && `n° ${l.numeroSerie}`, l.etat].filter(Boolean).join(" · ")}</span>
                </td>
                <td className="py-1.5 text-right tabular-nums">{euros(l.prixCentimes)}</td>
              </tr>
            ))}
            <tr>
              <td className="pt-2 font-semibold text-slate-800">Total</td>
              <td className="pt-2 text-right text-base font-semibold tabular-nums text-brand-slate">{euros(total)}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs italic text-slate-600">Soit {montantEnLettres(total)}.</p>
        <p className="text-slate-700">
          Paiement : {a.modePaiement ? LIBELLE_PAIEMENT[a.modePaiement] : "—"}
          {a.referencePaiement && ` n° ${a.referencePaiement}`}
          {a.banque && ` (${a.banque})`}, le {jma(a.datePaiement)} · remise du matériel le {jma(a.dateRemise)}. Le transfert de propriété intervient au
          complet paiement du prix.
        </p>
        <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">Le vendeur certifie sur l&apos;honneur :</p>
          <ul className="ml-4 list-disc">
            <li>être un particulier agissant à titre privé et non professionnel, dans le cadre d&apos;une vente occasionnelle ;</li>
            <li>être le propriétaire légitime du matériel désigné ci-dessus, qui n&apos;est ni volé, ni gagé, ni loué, ni grevé d&apos;aucun droit au profit d&apos;un tiers ;</li>
            <li>avoir informé l&apos;acheteur de tout défaut connu du matériel.</li>
          </ul>
          <p className="mt-1">L&apos;acheteur reconnaît avoir examiné et, le cas échéant, essayé le matériel, et l&apos;accepte dans l&apos;état décrit ci-dessus.</p>
        </div>
      </section>

      <div id="signatures" className="scroll-mt-4" />
      <SignatureSurPlace
        id={a.id}
        vendeur={a.vendeurNom}
        vendeurEmail={a.vendeurEmail ?? ""}
        representant={[a.representant, a.qualite].filter(Boolean).join(", ")}
        maSignature={signature ? signatureEnDataUrl(signature.image) : null}
        dejaInventaire={!!a.factureId}
      />
    </div>
  );
}
