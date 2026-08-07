import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { FicheIdentiteForm } from "@/components/frais/FicheIdentiteForm";
import { DocumentUploadForm } from "@/components/frais/DocumentUploadForm";
import type { TypeDocument } from "@/generated/prisma/client";

export default async function FicheIdentitePage() {
  const session = await auth();

  const [identite, documents] = await Promise.all([
    db.identiteProf.findUnique({ where: { profId: session!.user.id } }),
    db.documentProf.findMany({ where: { profId: session!.user.id } }),
  ]);

  const documentParType = (type: TypeDocument) => documents.find((d) => d.type === type) ?? null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/frais" className="text-sm text-brand-accent hover:underline">
          ← Mes frais
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-brand-slate">Ma fiche identité</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ces informations servent de justificatif pour le remboursement de vos frais
          kilométriques. Elles ne sont demandées qu&apos;une seule fois.
        </p>
      </div>

      <FicheIdentiteForm identite={identite} />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-brand-slate">Pièces justificatives</h2>
        <DocumentUploadForm
          type="PERMIS_CONDUIRE"
          label="Copie du permis de conduire"
          document={documentParType("PERMIS_CONDUIRE")}
        />
        <DocumentUploadForm
          type="CARTE_IDENTITE"
          label="Copie de la carte d'identité"
          document={documentParType("CARTE_IDENTITE")}
        />
      </div>
    </div>
  );
}
