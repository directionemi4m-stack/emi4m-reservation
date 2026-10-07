import Link from "next/link";
import { db } from "@/lib/db";
import { lireConsignes } from "@/lib/securite";
import { ConsignesForm } from "@/components/securite/ConsignesForm";
import { CodeAlarmeLigne } from "@/components/securite/CodeAlarmeLigne";

function formatDate(date: Date) {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function AdminSecuritePage() {
  const [consignes, salaries] = await Promise.all([
    lireConsignes(),
    db.user.findMany({
      where: { actif: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
      // Seulement la date de mise à jour : aucun code n'est déchiffré pour afficher la liste.
      select: { id: true, nom: true, prenom: true, codeAlarme: { select: { majLe: true } } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold text-brand-slate">Sécurité des bâtiments</h1>
        <Link href="/securite" className="text-sm text-brand-accent hover:underline">
          Voir la page des salariés
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-brand-slate">Consignes de sécurité — Villard-de-Lans</h2>
        <ConsignesForm consignes={consignes} />
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold text-brand-slate">Codes d&apos;alarme — Lans-en-Vercors</h2>
          <p className="text-sm text-slate-500">
            Un code personnel par salarié, stocké chiffré. Chacun ne voit que le sien, depuis la page
            Sécurité.
          </p>
        </div>
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-100 text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Salarié</th>
                <th className="px-4 py-2 font-medium">Code</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {salaries.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-700">
                    {s.prenom} {s.nom}
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {s.codeAlarme ? `Défini le ${formatDate(s.codeAlarme.majLe)}` : "Non défini"}
                  </td>
                  <td className="px-4 py-2">
                    <CodeAlarmeLigne userId={s.id} defini={!!s.codeAlarme} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
