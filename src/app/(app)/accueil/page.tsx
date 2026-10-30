import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { etatsAccueil } from "@/lib/accueil";
import { sectionsPour } from "@/lib/navigation";
import { GrilleTuiles, Tuile } from "@/components/navigation/Tuile";

export default async function AccueilPage() {
  const session = await auth();
  const userId = session!.user.id;
  const estAdmin = session!.user.role === "ADMIN";

  const [moi, etats] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { prenom: true } }),
    etatsAccueil(userId, estAdmin),
  ]);

  const date = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Bonjour {moi?.prenom ?? ""}</h1>
        <p className="text-sm text-slate-500 first-letter:uppercase">{date}</p>
      </div>

      {sectionsPour(estAdmin).map((section) => (
        <section key={section.titre} className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{section.titre}</h2>
          <GrilleTuiles>
            {section.liens.map((lien) => (
              <Tuile key={lien.href} lien={lien} {...etats[lien.href]} />
            ))}
          </GrilleTuiles>
        </section>
      ))}
    </div>
  );
}
