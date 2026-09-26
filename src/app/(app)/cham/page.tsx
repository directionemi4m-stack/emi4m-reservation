import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ListeCham } from "@/components/cham/ListeCham";

export default async function ChamPage() {
  const session = await auth();
  const estAdmin = session?.user.role === "ADMIN";

  const eleves = await db.eleveCham.findMany({
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    select: {
      id: true,
      prenom: true,
      nom: true,
      age: true,
      telephone: true,
      email: true,
      ville: true,
      autorisationSortie: true,
      precisionsSortie: true,
    },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Élèves CHAM</h1>
        <p className="text-sm text-slate-500">
          Liste consultable par tous les enseignants
          {estAdmin ? " — vous pouvez la modifier en tant que direction." : ", modifiable par la direction uniquement."}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          « À renseigner » signifie que l&apos;autorisation n&apos;est pas connue : en cas de doute, ne laissez pas
          l&apos;enfant partir seul.
        </p>
      </div>

      <ListeCham eleves={eleves} estAdmin={estAdmin} />
    </div>
  );
}
