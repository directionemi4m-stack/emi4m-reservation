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
    <div className="flex min-h-screen bg-slate-50">
      <MenuLateral estAdmin={session.user.role === "ADMIN"} deconnexion={deconnexion} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader impersonation={session.user.impersonation} />
        <main className="flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pt-6 md:pb-6">{children}</main>
      </div>
      <BarreMobile />
    </div>
  );
}
