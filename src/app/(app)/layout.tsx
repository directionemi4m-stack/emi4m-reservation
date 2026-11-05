import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { BarreMobile, MenuLateral } from "@/components/navigation/Navigation";

async function deconnexion() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    // À l'impression (programme, bilan…), seule la page sort : menus et barres sont masqués.
    <div className="flex min-h-screen bg-slate-50 print:bg-white">
      <div className="contents print:hidden">
        <MenuLateral estAdmin={session.user.role === "ADMIN"} deconnexion={deconnexion} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="contents print:hidden">
          <AppHeader impersonation={session.user.impersonation} />
        </div>
        <main className="flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pt-6 md:pb-6 print:p-0">{children}</main>
      </div>
      <div className="contents print:hidden">
        <BarreMobile />
      </div>
    </div>
  );
}
