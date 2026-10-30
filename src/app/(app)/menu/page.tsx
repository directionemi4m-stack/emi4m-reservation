import { IconLogout } from "@tabler/icons-react";
import { auth, signOut } from "@/lib/auth";
import { PARAMETRES, sectionsPour } from "@/lib/navigation";
import { GrilleTuiles, Tuile } from "@/components/navigation/Tuile";
import { ActiverNotifications } from "@/components/notifications/ActiverNotifications";

// Écran « Plus » du téléphone : toute l'appli en tuiles, sans les lignes d'état (la page
// d'accueil les montre déjà).
export default async function MenuPage() {
  const session = await auth();
  const estAdmin = session!.user.role === "ADMIN";

  async function deconnexion() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  const sections = [
    ...sectionsPour(estAdmin),
    ...(estAdmin ? [{ titre: "Paramètres", liens: PARAMETRES }] : []),
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="text-xl font-semibold text-brand-slate">Toute l&apos;appli</h1>
      {sections.map((section) => (
        <section key={section.titre} className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{section.titre}</h2>
          <GrilleTuiles>
            {section.liens.map((lien) => (
              <Tuile key={lien.href} lien={lien} />
            ))}
          </GrilleTuiles>
        </section>
      ))}
      <ActiverNotifications bloque={Boolean(session!.user.impersonation)} />
      <form action={deconnexion}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 hover:border-slate-300"
        >
          <IconLogout size={18} stroke={1.75} aria-hidden />
          Déconnexion
        </button>
      </form>
    </div>
  );
}
