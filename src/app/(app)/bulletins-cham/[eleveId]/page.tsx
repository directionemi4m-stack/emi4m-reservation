import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { libellePeriode, MATIERES_CHAM, signatureEnDataUrl } from "@/lib/bulletinsCham";
import { contexteBulletins } from "@/lib/calendrierBulletinsServeur";
import { AjouterMaPartie, BoutonRecompiler, FormAppreciation, FormSignatureDirection } from "@/components/bulletins/FormsBulletin";
import { RetirerSignature } from "@/components/bulletins/RetirerSignature";
import { nomDirection } from "@/lib/bulletinsChamServeur";
import { MAIL_DIRECTION } from "@/lib/clesServeur";
import { libelleClasse } from "@/lib/cham";

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

  const { periode: courante } = await contexteBulletins(new Date());
  const t = Number((await searchParams).t);
  const periode = { anneeDebut: courante.anneeDebut, trimestre: [1, 2, 3].includes(t) ? t : courante.trimestre };

  const [eleve, mesSuivis, appreciations, bulletin, maSignature, direction] = await Promise.all([
    db.eleveCham.findUnique({ where: { id: eleveId }, select: { id: true, prenom: true, nom: true, anneeSixieme: true, division: true, anneeDivision: true } }),
    db.suiviCham.findMany({ where: { eleveId, profId: userId } }),
    db.appreciationCham.findMany({
      where: { eleveId, ...periode },
      include: { prof: { select: { prenom: true, nom: true, email: true } } },
      orderBy: { signeLe: "asc" },
    }),
    db.bulletinCham.findUnique({ where: { eleveId_anneeDebut_trimestre: { eleveId, ...periode } } }),
    db.signatureBulletin.findUnique({ where: { userId } }),
    nomDirection(),
  ]);
  if (!eleve) notFound();
  const classe = libelleClasse(eleve, periode.anneeDebut);

  const signatureParDefaut = !impersonation && maSignature ? signatureEnDataUrl(maSignature.image) : null;
  const signeDirection = bulletin?.signeDirectionLe?.getTime() ?? 0;
  const modifieApresSignature = signeDirection > 0 && appreciations.some((a) => a.signeLe.getTime() > signeDirection);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <Link href={`/bulletins-cham?t=${periode.trimestre}`} className="text-sm text-brand-accent hover:underline">
          ← Bulletins CHAM
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-brand-slate">
          {eleve.nom.toUpperCase()} {eleve.prenom}
        </h1>
        <p className="text-sm text-slate-500">
          {classe ? `Classe : ${classe} · ` : ""}Bulletin du {libellePeriode(periode.anneeDebut, periode.trimestre)}
        </p>
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
                  {[a.precision, a.signataireNom ?? (a.prof.email === MAIL_DIRECTION ? direction : `${a.prof.prenom} ${a.prof.nom}`)].filter(Boolean).join(" · ")} — signé le {dateCourte(a.signeLe)}
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

            {mesParties.length === 0 && !impersonation && (
              <AjouterMaPartie eleveId={eleve.id} matiere={m.valeur} periode={periode} signature={signatureParDefaut} />
            )}
          </section>
        );
      })}

      <section className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-center text-base font-semibold text-brand-slate">Signature de la direction</h2>
        {bulletin?.signeDirectionLe ? (
          <p className="text-center text-xs text-slate-500">
            Signé par {bulletin.directionNom ?? direction} le {dateCourte(bulletin.signeDirectionLe)}
            {!bulletin.envoyeLe && !impersonation && estAdmin && (
              <>
                {" · "}
                <RetirerSignature
                  periode={periode}
                  eleveId={eleve.id}
                  question={`Retirer votre signature du bulletin de ${eleve.prenom} ${eleve.nom} ?`}
                  libelle="Retirer ma signature"
                />
              </>
            )}
          </p>
        ) : (
          <p className="text-center text-xs text-slate-500">{direction}</p>
        )}
        {estAdmin && modifieApresSignature && (
          <p className="rounded-md bg-amber-50 p-2 text-center text-xs font-medium text-amber-800">
            ⚠ Un prof a modifié sa partie après votre signature : relisez, puis signez à nouveau pour valider.
          </p>
        )}
        {estAdmin && (
          <>
            <FormSignatureDirection
              eleveId={eleve.id}
              periode={periode}
              signature={
                bulletin?.signatureDirection && !impersonation ? signatureEnDataUrl(bulletin.signatureDirection) : signatureParDefaut
              }
              dejaSigne={Boolean(bulletin?.signeDirectionLe)}
              bloque={impersonation}
            />
          </>
        )}
      </section>

      {estAdmin && (
        <section className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-brand-slate">Bulletin compilé (PDF)</h2>
          <a
            href={`/api/bulletins-cham/${eleve.id}?annee=${periode.anneeDebut}&t=${periode.trimestre}`}
            target="_blank"
            rel="noopener"
            className="w-fit rounded-md bg-brand-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-accent/90"
          >
            Voir le bulletin tel qu&apos;il sera envoyé
          </a>
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
