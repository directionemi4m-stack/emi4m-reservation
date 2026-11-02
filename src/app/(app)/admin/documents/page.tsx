import { db } from "@/lib/db";
import { dateCourte } from "@/lib/documentsSignes";
import { signataires } from "@/lib/documentsSignesServeur";
import { CarteDocument, FormPublication, type DocumentAdminVue } from "@/components/documents/AdminDocuments";

// Documents que tous les salariés lisent et signent dans l'appli (page « Sécurité ») :
// publication, suivi des signatures, nouvelles versions. Réservé à la direction (cf.
// admin/layout.tsx). Copies signées et registres : « Documents signés » dans le Drive.
export default async function DocumentsPage() {
  const [documents, attendus] = await Promise.all([
    db.documentASigner.findMany({
      orderBy: [{ retireLe: { sort: "desc", nulls: "first" } }, { creeLe: "asc" }],
      select: {
        id: true,
        titre: true,
        attestation: true,
        version: true,
        publieLe: true,
        relanceLe: true,
        retireLe: true,
        registreUrl: true,
        signatures: { select: { userId: true, version: true, signeLe: true, url: true, user: { select: { prenom: true, nom: true } } } },
      },
    }),
    signataires(),
  ]);

  const vues: DocumentAdminVue[] = documents.map((d) => {
    const courantes = d.signatures.filter((s) => s.version === d.version);
    const parUser = new Map(courantes.map((s) => [s.userId, s]));
    const idsAttendus = new Set(attendus.map((p) => p.id));
    return {
      id: d.id,
      titre: d.titre,
      attestation: d.attestation,
      version: d.version,
      publieLe: dateCourte(d.publieLe),
      relanceLe: d.relanceLe ? dateCourte(d.relanceLe) : null,
      retire: !!d.retireLe,
      registreUrl: d.registreUrl,
      copiesManquantes: courantes.filter((s) => !s.url).length,
      signataires: [
        ...attendus.map((p) => {
          const s = parUser.get(p.id);
          return { nom: `${p.prenom} ${p.nom}`, signeLe: s ? dateCourte(s.signeLe) : null, url: s?.url ?? null };
        }),
        // Signé puis parti de l'école : la signature reste visible.
        ...courantes
          .filter((s) => !idsAttendus.has(s.userId))
          .map((s) => ({ nom: `${s.user.prenom} ${s.user.nom}`, signeLe: dateCourte(s.signeLe), url: s.url })),
      ],
    };
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Documents à signer</h1>
        <p className="text-sm text-slate-500">
          Chaque prof lit le document et le signe depuis la page « Sécurité ». Les copies signées et le registre des
          signatures sont rangés dans le Drive (dossier « Documents signés »). Les retardataires sont relancés
          automatiquement une semaine après la publication.
        </p>
      </div>

      <section className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-brand-slate">Nouveau document</h2>
        <FormPublication />
      </section>

      {vues.length > 0 && (
        <ul className="flex flex-col gap-3">
          {vues.map((d) => (
            <CarteDocument key={`${d.id}-${d.version}`} document={d} />
          ))}
        </ul>
      )}
    </div>
  );
}
