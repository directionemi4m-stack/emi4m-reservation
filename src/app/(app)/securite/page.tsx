import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lireConsignes } from "@/lib/securite";
import { ConsignesAffiche } from "@/components/securite/ConsignesAffiche";
import { MonCodeAlarme } from "@/components/securite/MonCodeAlarme";

export default async function SecuritePage() {
  const session = await auth();

  const [consignes, code] = await Promise.all([
    lireConsignes(),
    // Seulement l'existence du code : sa valeur n'est jamais rendue dans la page (cf.
    // revelerMonCode, appelée au clic).
    db.codeAlarme.findUnique({ where: { userId: session!.user.id }, select: { id: true } }),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold text-brand-slate">Sécurité des bâtiments</h1>
        {session!.user.role === "ADMIN" && (
          <Link href="/admin/parametres/securite" className="text-sm text-brand-accent hover:underline">
            Modifier les consignes et les codes
          </Link>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-brand-slate">Villard-de-Lans — Consignes de sécurité</h2>
        <ConsignesAffiche consignes={consignes} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-brand-slate">Lans-en-Vercors — Mon code d&apos;alarme</h2>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs text-slate-500">
            Code personnel, différent pour chaque salarié : ne le communiquez à personne.
          </p>
          <MonCodeAlarme aUnCode={!!code} />
        </div>
      </section>
    </div>
  );
}
