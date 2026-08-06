import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PresencesSousNav } from "@/components/presences/PresencesSousNav";

export default async function ExportPresencesPage() {
  const session = await auth();
  const estAdmin = session!.user.role === "ADMIN";

  const total = await db.pointage.count({
    where: estAdmin ? {} : { profId: session!.user.id },
  });

  return (
    <div>
      <PresencesSousNav />
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-xl font-semibold text-brand-slate">Export</h1>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">
            {total} feuille{total !== 1 ? "s" : ""} de présence enregistrée{total !== 1 ? "s" : ""}
            {estAdmin ? " (toute l'école)" : ""}.
          </p>
          <a
            href="/api/presences/export"
            className="mt-4 inline-block rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent/90"
          >
            ⬇️ Télécharger en CSV
          </a>
        </div>
      </div>
    </div>
  );
}
