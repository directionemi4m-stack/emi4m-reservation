import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/lib/auth";

export function AppHeader({ role }: { role: "PROF" | "ADMIN" }) {
  return (
    <header className="flex items-center justify-between bg-brand-slate px-6 py-3 text-white">
      <div className="flex items-center gap-3">
        <Image src="/logo-emi4m.png" alt="EMI4M" width={40} height={40} className="rounded-full" />
        <span className="font-semibold">Réservation des salles</span>
      </div>
      <nav className="flex items-center gap-5 text-sm">
        <Link href="/planning" className="hover:text-brand-accent">
          Planning
        </Link>
        <Link href="/demandes" className="hover:text-brand-accent">
          Mes demandes
        </Link>
        {role === "ADMIN" && (
          <>
            <Link href="/admin/demandes" className="hover:text-brand-accent">
              Demandes à traiter
            </Link>
            <Link href="/admin/parametres/profs" className="hover:text-brand-accent">
              Profs
            </Link>
            <Link href="/admin/parametres/salles" className="hover:text-brand-accent">
              Salles
            </Link>
          </>
        )}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="rounded-md bg-white/10 px-3 py-1.5 transition hover:bg-white/20"
          >
            Déconnexion
          </button>
        </form>
      </nav>
    </header>
  );
}
