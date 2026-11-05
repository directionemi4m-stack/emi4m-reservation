import Link from "next/link";
import { IconDownload } from "@tabler/icons-react";
import { calculerBilan } from "@/lib/bilanServeur";
import { formaterPourcentage, pourcentage } from "@/lib/bilan";
import { saisonARentrer } from "@/lib/rentree";
import { BoutonImprimer } from "@/components/ui/BoutonImprimer";

// Le bilan d'une saison, pour l'AG, le conseil d'administration, la communauté de
// communes et les demandes de subvention. Réservé à la direction (cf. admin/layout.tsx).
export default async function BilanPage({ searchParams }: { searchParams: Promise<{ saison?: string }> }) {
  const { saison: param } = await searchParams;
  const courante = saisonARentrer(new Date());
  const saison = param && /^\d{4}$/.test(param) ? Number(param) : courante;
  const { libelle, sections } = await calculerBilan(saison);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold text-brand-slate">Bilan de la saison {libelle}</h1>
        <div className="flex gap-2 text-sm print:hidden">
          {[courante - 1, courante].map((s) => (
            <Link
              key={s}
              href={`/admin/bilan?saison=${s}`}
              className={`rounded-md border px-3 py-1 ${
                s === saison ? "border-brand-accent bg-brand-accent/10 font-semibold text-brand-accent" : "border-slate-300 text-slate-600"
              }`}
            >
              {s}-{s + 1}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <BoutonImprimer />
        <a
          href={`/api/bilan?saison=${saison}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <IconDownload size={16} aria-hidden />
          Télécharger pour Excel
        </a>
        <p className="text-xs text-slate-500">Chiffres calculés à partir des données de l&apos;appli, mis à jour à chaque ouverture.</p>
      </div>

      {sections.map((s) => (
        <section key={s.titre} className="flex break-inside-avoid flex-col gap-3 rounded-lg bg-white p-4 shadow-sm print:border print:border-slate-200 print:shadow-none">
          <h2 className="text-base font-semibold text-brand-slate">{s.titre}</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            {s.chiffres.map((c) => (
              <div key={c.libelle}>
                <dt className="text-xs text-slate-500">{c.libelle}</dt>
                <dd className="text-xl font-semibold text-brand-slate">{c.nombre.toLocaleString("fr-FR")}</dd>
              </div>
            ))}
          </dl>
          {s.tableaux
            .filter((t) => t.lignes.length > 0)
            .map((t) => {
              const total = t.lignes.reduce((n, l) => n + l.nombre, 0);
              return (
                <div key={t.titre} className="break-inside-avoid">
                  <h3 className="mb-1 text-sm font-semibold text-slate-700">{t.titre}</h3>
                  <table className="w-full text-sm">
                    <tbody>
                      {t.lignes.map((l) => {
                        const p = pourcentage(l.nombre, total);
                        return (
                          <tr key={l.libelle} className="border-b border-slate-100 last:border-0">
                            <td className="py-1 pr-2 text-slate-700">{l.libelle}</td>
                            <td className="w-1/3 py-1 pr-2">
                              <div className="h-2 rounded-full bg-slate-100 print:border print:border-slate-300">
                                <div className="h-2 rounded-full bg-brand-accent/70" style={{ width: `${p}%` }} />
                              </div>
                            </td>
                            <td className="w-12 py-1 text-right font-medium tabular-nums text-slate-800">{l.nombre}</td>
                            <td className="w-16 py-1 text-right text-xs tabular-nums text-slate-500">{formaterPourcentage(p)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          {s.note && <p className="text-xs text-slate-500">{s.note}</p>}
        </section>
      ))}
    </div>
  );
}
