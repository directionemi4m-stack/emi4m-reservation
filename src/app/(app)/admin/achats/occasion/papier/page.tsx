import Link from "next/link";
import { ImportAttestationPapier } from "@/components/achats/ImportAttestationPapier";

const aujourdHui = () => new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });

// Attestation faite et signée sur papier : on l'archive avec le minimum d'informations.
export default function AttestationPapierPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/admin/achats/occasion" className="text-sm text-brand-accent hover:underline">
          ‹ Achats d&apos;occasion
        </Link>
        <h2 className="mt-1 text-lg font-semibold text-brand-slate">Archiver une attestation papier</h2>
        <p className="text-sm text-slate-500">
          Photographiez ou choisissez le PDF de l&apos;attestation signée, indiquez le vendeur et le matériel : elle est archivée dans le Drive
          (« Achats d&apos;occasion »), ajoutée aux achats et, si vous le voulez, à l&apos;inventaire.
        </p>
      </div>
      <ImportAttestationPapier jour={aujourdHui()} />
    </div>
  );
}
