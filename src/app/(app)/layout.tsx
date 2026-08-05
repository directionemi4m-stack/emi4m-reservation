import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppHeader } from "@/components/layout/AppHeader";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AppHeader role={session.user.role} />
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
