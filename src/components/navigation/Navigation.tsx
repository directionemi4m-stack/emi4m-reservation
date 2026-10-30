"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLogout } from "@tabler/icons-react";
import { BARRE_MOBILE, lienActif, sectionsPour, type LienNav } from "@/lib/navigation";
import { IconeNav, STYLE_ROND } from "@/components/navigation/IconeNav";

const ACCUEIL: LienNav = { href: "/accueil", label: "Accueil", icone: "accueil", couleur: "neutre" };

// Menu latéral sur ordinateur : les mêmes rubriques que la page d'accueil, toujours visibles.
export function MenuLateral({ estAdmin, deconnexion }: { estAdmin: boolean; deconnexion: () => Promise<void> }) {
  const pathname = usePathname();
  const sections = sectionsPour(estAdmin);
  const actif = lienActif(pathname, [ACCUEIL, ...sections.flatMap((s) => s.liens)]);

  const lien = (l: LienNav) => {
    const estActif = l.href === actif;
    return (
      <Link
        key={l.href}
        href={l.href}
        aria-current={estActif ? "page" : undefined}
        className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition ${
          estActif ? "bg-slate-100 font-semibold text-brand-slate" : "text-slate-600 hover:bg-slate-50 hover:text-brand-slate"
        }`}
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            estActif ? STYLE_ROND[l.couleur] : "text-slate-500"
          }`}
        >
          <IconeNav cle={l.icone} taille={18} />
        </span>
        <span className="truncate">{l.label}</span>
      </Link>
    );
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <Link href="/accueil" className="flex items-center gap-2 px-4 py-4">
        <Image src="/logo-emi4m.png" alt="" width={32} height={32} className="rounded-full" />
        <span className="font-semibold text-brand-slate">EMI4M</span>
      </Link>
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 pb-4">
        <div className="flex flex-col gap-0.5">{lien(ACCUEIL)}</div>
        {sections.map((s) => (
          <div key={s.titre} className="flex flex-col gap-0.5">
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{s.titre}</p>
            {s.liens.map(lien)}
          </div>
        ))}
      </nav>
      <form action={deconnexion} className="border-t border-slate-200 p-2">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-brand-slate"
        >
          <span className="flex h-7 w-7 items-center justify-center text-slate-500">
            <IconLogout size={18} stroke={1.75} aria-hidden />
          </span>
          Déconnexion
        </button>
      </form>
    </aside>
  );
}

// Barre du bas sur téléphone. « Plus » s'allume aussi sur toutes les pages qui n'ont pas
// leur propre bouton dans la barre (frais, annuaire…).
export function BarreMobile() {
  const pathname = usePathname();
  const actif = lienActif(pathname, BARRE_MOBILE) ?? "/menu";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {BARRE_MOBILE.map((l) => {
          const estActif = l.href === actif;
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={estActif ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${
                estActif ? "font-semibold text-brand-slate" : "text-slate-500"
              }`}
            >
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full transition ${
                  estActif ? STYLE_ROND[l.couleur] : ""
                }`}
              >
                <IconeNav cle={l.icone} taille={20} />
              </span>
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
