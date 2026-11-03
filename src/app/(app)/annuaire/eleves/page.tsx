import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comparerEleves } from "@/lib/annuaireEleves";
import { AnnuaireEleves } from "@/components/annuaire/AnnuaireEleves";
import { OngletsAnnuaire } from "@/components/annuaire/OngletsAnnuaire";

// Annuaire des élèves de l'année, consultable par tous les comptes de l'école, tiré du
// fichier des inscriptions importé par la direction (cf. /admin/annuaire-eleves).
export default async function AnnuaireElevesPage() {
  const session = await auth();
  const estAdmin = session?.user.role === "ADMIN";
  const [eleves, dernier] = await Promise.all([
    db.eleveAnnuaire.findMany(),
    db.importAnnuaireEleves.findFirst({ orderBy: { importeLe: "desc" }, select: { importeLe: true } }),
  ]);
  eleves.sort(comparerEleves);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <OngletsAnnuaire actif="eleves" />

      {eleves.length > 0 ? (
        <>
          <p className="text-xs text-slate-500">
            Coordonnées des élèves et de leurs familles, à usage strictement interne à l&apos;école.
            {dernier &&
              ` Liste du ${dernier.importeLe.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" })}.`}
            {estAdmin && (
              <>
                {" "}
                <Link href="/admin/annuaire-eleves" className="text-brand-accent hover:underline">
                  Importer un nouveau fichier
                </Link>
              </>
            )}
          </p>
          <AnnuaireEleves eleves={eleves} />
        </>
      ) : (
        <p className="rounded-lg bg-white p-4 text-sm text-slate-500 shadow-sm">
          L&apos;annuaire des élèves n&apos;a pas encore été importé.
          {estAdmin && (
            <>
              {" "}
              <Link href="/admin/annuaire-eleves" className="text-brand-accent hover:underline">
                Importer le fichier des inscriptions
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
