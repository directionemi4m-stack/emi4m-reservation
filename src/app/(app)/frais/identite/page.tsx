import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { FicheIdentiteForm } from "@/components/frais/FicheIdentiteForm";

export default async function FicheIdentitePage() {
  const session = await auth();

  const identite = await db.identiteProf.findUnique({
    where: { profId: session!.user.id },
  });

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
    </div>
  );
}
