import Link from "next/link";
import type { LienNav } from "@/lib/navigation";
import { IconeNav, STYLE_ROND } from "@/components/navigation/IconeNav";

// Une tuile façon Home Assistant : icône dans un rond coloré, titre, et une ligne d'état
// facultative (« Piano · 17h00 », « Oct. : 46,80 € »). La pastille rouge signale
// quelque chose à traiter.
export function Tuile({ lien, statut, pastille }: { lien: LienNav; statut?: string; pastille?: number }) {
  return (
    <Link
      href={lien.href}
      className="relative flex min-w-0 flex-col items-center rounded-xl border border-slate-200 bg-white px-2 pb-3 pt-4 text-center transition hover:border-slate-300 hover:shadow-sm active:scale-[0.98]"
    >
      {pastille ? (
        <span className="absolute right-2 top-2 rounded-full bg-status-occupee px-1.5 text-xs font-semibold text-white">
          {pastille}
        </span>
      ) : null}
      <span className={`mb-2 flex h-11 w-11 items-center justify-center rounded-full ${STYLE_ROND[lien.couleur]}`}>
        <IconeNav cle={lien.icone} taille={22} />
      </span>
      <span className="line-clamp-2 w-full text-sm font-semibold leading-tight text-brand-slate">{lien.label}</span>
      {statut && <span className="mt-1 line-clamp-2 w-full text-xs leading-snug text-slate-500">{statut}</span>}
    </Link>
  );
}

export function GrilleTuiles({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">{children}</div>;
}
