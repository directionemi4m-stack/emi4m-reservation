import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/lib/auth";
import { arreterImpersonation } from "@/app/(app)/admin/parametres/profs/actions";
import { HeaderNav } from "@/components/layout/HeaderNav";

export function AppHeader({
  role,
  impersonation,
}: {
  role: "PROF" | "ADMIN";
  impersonation?: { direction: { id: string; nom: string }; cible: { id: string; nom: string; prenom: string } };
}) {
  async function deconnexion() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

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
      <header className="relative flex items-center justify-between bg-brand-slate px-4 py-3 text-white sm:px-6">
        <Link href="/planning">
          <Image src="/logo-emi4m.png" alt="EMI4M" width={40} height={40} className="rounded-full" />
        </Link>
        <HeaderNav role={role} deconnexion={deconnexion} />
      </header>
    </>
  );
}
