import Image from "next/image";
import Link from "next/link";
import { arreterImpersonation } from "@/app/(app)/admin/parametres/profs/actions";

// Bandeau « connecté·e en tant que » (toutes tailles d'écran) et, sur téléphone seulement,
// une fine barre avec le logo : sur ordinateur, le logo est dans le menu latéral.
export function AppHeader({
  impersonation,
}: {
  impersonation?: { direction: { id: string; nom: string }; cible: { id: string; nom: string; prenom: string } };
}) {
  return (
    <>
      {impersonation && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-status-attente/90 px-4 py-2 text-sm font-medium text-brand-slate sm:px-6">
          <span>
            Vous êtes connecté·e en tant que {impersonation.cible.prenom} {impersonation.cible.nom}.
          </span>
          <form action={arreterImpersonation}>
            <button type="submit" className="rounded-md bg-brand-slate px-3 py-1 text-xs font-semibold text-white hover:bg-brand-slate/80">
              Quitter
            </button>
          </form>
        </div>
      )}
      <header className="flex items-center gap-2 bg-brand-slate px-4 py-2 text-white md:hidden">
        <Link href="/accueil" className="flex items-center gap-2">
          <Image src="/logo-emi4m.png" alt="" width={32} height={32} className="rounded-full" />
          <span className="font-semibold">EMI4M</span>
        </Link>
      </header>
    </>
  );
}
