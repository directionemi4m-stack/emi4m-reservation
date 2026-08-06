import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/lib/auth";
import { HeaderNav } from "@/components/layout/HeaderNav";

export function AppHeader({ role }: { role: "PROF" | "ADMIN" }) {
  async function deconnexion() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <header className="relative flex items-center justify-between bg-brand-slate px-4 py-3 text-white sm:px-6">
      <Link href="/planning">
        <Image src="/logo-emi4m.png" alt="EMI4M" width={40} height={40} className="rounded-full" />
      </Link>
      <HeaderNav role={role} deconnexion={deconnexion} />
    </header>
  );
}
