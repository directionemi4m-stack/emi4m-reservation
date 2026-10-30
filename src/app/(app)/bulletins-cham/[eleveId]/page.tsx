import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { libellePeriode, MATIERES_CHAM, periodeCourante, signatureEnDataUrl } from "@/lib/bulletinsCham";
import { BoutonRecompiler, FormAppreciation, FormBilan } from "@/components/bulletins/FormsBulletin";

const dateCourte = (d: Date) => d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });

// Le bulletin d'un élève pour un trimestre, rubrique par rubrique comme sur le modèle
// papier. Chaque prof remplit et signe sa partie ; il voit celles de ses collègues (texte
// seulement : les signatures des autres ne sont visibles que dans le PDF de la direction).
export default async function BulletinElevePage({
  params,
  searchParams,
}: {
  params: Promise<{ eleveId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { eleveId } = await params;
  const session = await auth();
  const userId = session!.user.id;
  const estAdmin = session!.user.role === "ADMIN";
  const impersonation = Boolean(session!.user.impersonation);

  const courante = periodeCourante(new Date());
  const t = Number((await searchParams).t);
  const periode = { anneeDebut: courante.anneeDebut, trimestre: [1, 2, 3].includes(t) ? t : courante.trimestre };

  const [eleve, mesSuivis, appreciations, bulletin, maSignature] = await Promise.all([
    db.eleveCham.findUnique({ where: { id: eleveId }, select: { id: true, prenom: true, nom: true } }),
    db.suiviCham.findMany({ where: { eleveId, profId: userId } }),
    db.appreciationCham.findMany({
      where: { eleveId, ...periode },
      include: { prof: { select: { prenom: true, nom: true } } },
      orderBy: { signeLe: "asc" },
    }),
    db.bulletinCham.findUnique({
      where: { eleveId_anneeDebut_trimestre: { eleveId, ...periode } },
      include: { direction: { select: { prenom: true, nom: true } } },
    }),
    db.signatureBulletin.findUnique({ where: { userId } }),
  ]);
  if (!eleve) notFound();

  const signatureParDefaut = !impersonation && maSignature ? signatureEnDataUrl(maSignature.image) : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <Link href={`/bulletins-cham?t=${periode.trimestre}`} className="text-sm text-brand-accent hover:underline">
          ← Bulletins CHAM
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-brand-slate">
          {eleve.nom.toUpperCase()} {eleve.prenom}
        </h1>
        <p className="text-sm text-slate-500">Bulletin du {libellePeriode(periode.anneeDebut, periode.trimestre)}</p>
      </div>

      {impersonation && (
        <p className="rounded-lg bg-status-attente/20 p-3 text-sm text-brand-slate">
          Mode « connecté en tant que » : consultation seulement, la signature est réservée au prof lui-même.
        </p>
      )}

      {MATIERES_CHAM.map((m) => {
        const parties = appreciations.filter((a) => a.matiere === m.valeur);
        const mesParties = mesSuivis.filter((s) => s.matiere === m.valeur);
        const autres = parties.filter((a) => a.profId !== userId);
        return (
          <section key={m.valeur} className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
            <h2 className="text-center text-base font-semibold text-brand-slate">{m.label}</h2>

            {autres.map((a) => (
              <div key={a.id} className="border-l-2 border-slate-200 pl-3">
                <p className="text-xs text-slate-500">
                  {[a.precision, `${a.prof.prenom} ${a.prof.nom}`].filter(Boolean).join(" · ")} — signé le {dateCourte(a.signeLe)}
                </p>
                <p className="whitespace-pre-line text-sm text-slate-700">{a.texte}</p>
              </div>
            ))}

            {mesParties.map((s) => {
              const mienne = parties.find((a) => a.profId === userId);
              return (
                <div key={s.id} className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-slate-500">
                    Ma partie{s.precision ? ` · ${s.precision}` : ""}
                    {mienne ? ` — signée le ${dateCourte(mienne.signeLe)}` : ""}
                  </p>
                  <FormAppreciation
                    eleveId={eleve.id}
                    matiere={m.valeur}
                    periode={periode}
                    texte={mienne?.texte ?? ""}
                    signature={mienne && !impersonation ? signatureEnDataUrl(mienne.signature) : signatureParDefaut}
                    dejaSigne={Boolean(mienne)}
                    bloque={impersonation}
                  />
                </div>
              );
            })}

            {autres.length === 0 && mesParties.length === 0 && (
              <p className="text-center text-sm italic text-slate-400">Non renseigné</p>
            )}
          </section>
        );
      })}

      <section className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-center text-base font-semibold text-brand-slate">Bilan</h2>
        {estAdmin ? (
          <>
            {bulletin?.signeDirectionLe && (
              <p className="text-xs text-slate-500">
                Signé par {bulletin.direction ? `${bulletin.direction.prenom} ${bulletin.direction.nom}` : "la direction"} le{" "}
                {dateCourte(bulletin.signeDirectionLe)}
              </p>
            )}
            <FormBilan
              eleveId={eleve.id}
              periode={periode}
              bilan={bulletin?.bilan ?? ""}
              signature={
                bulletin?.signatureDirection && !impersonation ? signatureEnDataUrl(bulletin.signatureDirection) : signatureParDefaut
              }
              dejaSigne={Boolean(bulletin?.signeDirectionLe)}
              bloque={impersonation}
            />
          </>
        ) : bulletin?.bilan ? (
          <p className="whitespace-pre-line text-sm text-slate-700">{bulletin.bilan}</p>
        ) : (
          <p className="text-center text-sm italic text-slate-400">Rédigé par la direction</p>
        )}
      </section>

      {estAdmin && (
        <section className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-brand-slate">Bulletin compilé (PDF)</h2>
          {bulletin?.documentUrl ? (
            <p className="text-sm text-slate-600">
              <a href={bulletin.documentUrl} target="_blank" rel="noreferrer" className="text-brand-accent hover:underline">
                Ouvrir dans le Drive
              </a>
              {bulletin.documentMajLe && <span className="text-slate-400"> · mis à jour le {dateCourte(bulletin.documentMajLe)}</span>}
            </p>
          ) : (
            <p className="text-sm text-slate-500">Créé dans le dossier « Suivi CHAM » du Drive dès la première signature.</p>
          )}
          <BoutonRecompiler eleveId={eleve.id} periode={periode} />
        </section>
      )}
    </div>
  );
}
