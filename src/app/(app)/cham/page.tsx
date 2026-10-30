import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ListeCham } from "@/components/cham/ListeCham";

export default async function ChamPage() {
  const session = await auth();
  const estAdmin = session?.user.role === "ADMIN";

  const lignes = await db.eleveCham.findMany({
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    select: {
      id: true,
      prenom: true,
      nom: true,
      age: true,
      telephone: true,
      email: true,
      ville: true,
      autorisationIntercours: true,
      autorisationSortie16h30: true,
      precisionsSortie: true,
      documentUrl: true,
      documentMajLe: true,
    },
  });
  // La fiche scannée (signatures, coordonnées des parents) n'est transmise qu'à la
  // direction : les profs ne reçoivent même pas son lien.
  const eleves = lignes.map(({ documentUrl, documentMajLe, ...e }) => ({
    ...e,
    document: estAdmin && documentUrl ? { url: documentUrl, majLe: documentMajLe?.toISOString() ?? null } : null,
  }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Élèves CHAM</h1>
        <p className="text-sm text-slate-500">
          Liste consultable par tous les enseignants
          {estAdmin ? " — vous pouvez la modifier en tant que direction." : ", modifiable par la direction uniquement."}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Deux autorisations par élève : la sortie intercours et la sortie à 16h30. « À renseigner » signifie
          que l&apos;autorisation n&apos;est pas connue : en cas de doute, ne laissez pas l&apos;enfant sortir seul.
        </p>
      </div>

      <ListeCham eleves={eleves} estAdmin={estAdmin} />
    </div>
  );
}
