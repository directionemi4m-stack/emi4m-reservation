import type { Metadata } from "next";
import Image from "next/image";
import { db } from "@/lib/db";
import { attendPresidence, lienPresidenceValide, titreContrat } from "@/lib/contratsServeur";
import { SignaturePresidence } from "@/components/contrats/SignaturePresidence";

export const metadata: Metadata = { title: "Signature des contrats — EMI4M", robots: { index: false, follow: false } };

// Page ouverte par la présidence depuis le lien reçu par mail (sans compte dans l'appli) :
// elle lit les contrats et avenants en attente, puis les paraphe et signe.
export default async function SignaturePresidencePage({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const p = await lienPresidenceValide(jeton);
  const documents = p
    ? await db.contratProf.findMany({
        where: attendPresidence,
        orderBy: [{ anneeDebut: "desc" }, { prof: { nom: "asc" } }],
        select: { id: true, type: true, titre: true, anneeDebut: true, prof: { select: { prenom: true, nom: true } } },
      })
    : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 bg-slate-50 px-4 py-6">
      <div className="flex items-center gap-3">
        <Image src="/logo-emi4m.png" alt="EMI4M" width={44} height={44} className="rounded-full" />
        <div>
          <p className="text-xs font-semibold text-slate-500">EMI4M · École Musicale Itinérante des 4 Montagnes</p>
          <h1 className="text-lg font-semibold text-brand-slate">Contrats et avenants à signer</h1>
        </div>
      </div>
      {!p ? (
        <p className="rounded-lg bg-white p-4 text-sm text-slate-700 shadow-sm">
          Ce lien n&apos;est plus valable (il a expiré ou un nouveau lien a été envoyé). Demandez à la direction de vous en renvoyer un.
        </p>
      ) : documents.length === 0 ? (
        <p className="rounded-lg bg-white p-4 text-sm text-slate-700 shadow-sm">Bonjour {p.nom}, tout est signé : chaque prof a reçu son document par mail pour le signer à son tour. Merci !</p>
      ) : (
        <>
          <p className="text-sm text-slate-600">
            Bonjour {p.nom}
            {p.qualite && ` (${p.qualite})`}, vous signez pour l&apos;EMI4M. Chaque prof recevra ensuite son document pour le signer à son tour.
          </p>
          <SignaturePresidence
            jeton={jeton}
            documents={documents.map((d) => ({ id: d.id, prof: `${d.prof.prenom} ${d.prof.nom.toUpperCase()}`, titre: titreContrat(d) }))}
          />
        </>
      )}
    </main>
  );
}
