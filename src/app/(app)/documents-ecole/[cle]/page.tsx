import { notFound } from "next/navigation";
import { IconFileTypePdf } from "@tabler/icons-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documentEcole } from "@/lib/documentsEcole";
import { DepotDocumentEcole } from "@/components/documents/DepotDocumentEcole";

const dateLongue = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

// Un document de l'école (règlement intérieur, projet d'établissement) en consultation pour
// tous ; la direction y dépose le PDF et la date de sa dernière mise à jour.
export default async function DocumentEcolePage({ params }: { params: Promise<{ cle: string }> }) {
  const reference = documentEcole((await params).cle);
  if (!reference) notFound();
  const session = await auth();
  const estDirection = session?.user.role === "ADMIN";
  const doc = await db.documentEcole.findUnique({
    where: { cle: reference.cle },
    select: { majLe: true, deposeLe: true, nomFichier: true },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <h1 className="text-xl font-semibold text-brand-slate">{reference.titre}</h1>

      <section className="flex flex-col gap-3 rounded-lg bg-white p-5 shadow-sm">
        {doc ? (
          <>
            <p className="text-sm text-slate-600">
              Dernière mise à jour : <strong className="text-slate-800">{dateLongue(doc.majLe)}</strong>
            </p>
            <a
              href={`/api/documents-ecole/${reference.cle}`}
              target="_blank"
              rel="noopener"
              className="inline-flex w-fit items-center gap-2 rounded-md bg-brand-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-accent/90"
            >
              <IconFileTypePdf size={18} aria-hidden />
              Lire {reference.nom}
            </a>
          </>
        ) : (
          <p className="text-sm text-slate-500">{majuscule(reference.nom)} n&apos;est pas encore en ligne.</p>
        )}
      </section>

      {estDirection && (
        <section className="flex flex-col gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-5">
          <div>
            <h2 className="text-sm font-semibold text-brand-slate">Direction : mettre à jour</h2>
            <p className="text-xs text-slate-500">
              Les profs voient seulement le document et sa date. Un nouveau PDF remplace l&apos;ancien.
              {doc && ` PDF en ligne : ${doc.nomFichier}, déposé le ${doc.deposeLe.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}.`}
            </p>
          </div>
          <DepotDocumentEcole
            cle={reference.cle}
            nom={reference.nom}
            existe={!!doc}
            majLe={doc ? doc.majLe.toISOString().slice(0, 10) : null}
            aujourdHui={new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" })}
          />
        </section>
      )}
    </div>
  );
}
