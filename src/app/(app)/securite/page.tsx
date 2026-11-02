import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lireConsignes } from "@/lib/securite";
import { ConsignesAffiche } from "@/components/securite/ConsignesAffiche";
import { MonCodeAlarme } from "@/components/securite/MonCodeAlarme";
import { SignerDocument, type DocumentVue } from "@/components/documents/SignerDocument";
import { dateCourte } from "@/lib/documentsSignes";

export default async function SecuritePage() {
  const session = await auth();

  const userId = session!.user.id;
  const [consignes, code, documents, mesSignatures] = await Promise.all([
    lireConsignes(),
    // Seulement l'existence du code : sa valeur n'est jamais rendue dans la page (cf.
    // revelerMonCode, appelée au clic).
    db.codeAlarme.findUnique({ where: { userId }, select: { id: true } }),
    db.documentASigner.findMany({
      where: { retireLe: null },
      orderBy: { creeLe: "asc" },
      select: { id: true, titre: true, attestation: true, version: true, publieLe: true },
    }),
    db.signatureDocument.findMany({ where: { userId }, select: { documentId: true, version: true, signeLe: true } }),
  ]);

  // Les documents à signer d'abord, ceux déjà signés ensuite.
  const vues: DocumentVue[] = documents
    .map((d) => {
      const miennes = mesSignatures.filter((s) => s.documentId === d.id);
      const courante = miennes.find((s) => s.version === d.version);
      return {
        id: d.id,
        titre: d.titre,
        attestation: d.attestation,
        version: d.version,
        publieLe: dateCourte(d.publieLe),
        signeLe: courante ? dateCourte(courante.signeLe) : null,
        versionPrecedenteSignee: !courante && miennes.length > 0,
      };
    })
    .sort((a, b) => Number(!!a.signeLe) - Number(!!b.signeLe));
  const aSigner = vues.filter((v) => !v.signeLe).length;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h1 className="text-xl font-semibold text-brand-slate">Sécurité des bâtiments</h1>
        {session!.user.role === "ADMIN" && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/admin/documents" className="text-sm text-brand-accent hover:underline">
              Gérer les documents à signer
            </Link>
            <Link href="/admin/parametres/securite" className="text-sm text-brand-accent hover:underline">
              Modifier les consignes et les codes
            </Link>
          </div>
        )}
      </div>

      {vues.length > 0 && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-base font-semibold text-brand-slate">Documents à lire et signer</h2>
            <p className="text-xs text-slate-500">
              {aSigner > 0
                ? `${aSigner} document${aSigner > 1 ? "s" : ""} à signer : ouvrez-le, lisez-le, puis signez.`
                : "Tout est signé, merci !"}
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {vues.map((d) => (
              <SignerDocument key={`${d.id}-${d.version}`} document={d} bloque={!!session!.user.impersonation} />
            ))}
          </ul>
        </section>
      )}

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
