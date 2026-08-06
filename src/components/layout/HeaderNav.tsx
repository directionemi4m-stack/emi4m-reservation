"use client";

import Link from "next/link";
import { useState } from "react";

const LIENS_BASE = [
  { href: "/planning", label: "Planning" },
  { href: "/demandes", label: "Mes demandes" },
  { href: "/presences", label: "Présences" },
];

const LIENS_ADMIN = [
  { href: "/admin/demandes", label: "Demandes à traiter" },
  { href: "/admin/parametres/profs", label: "Profs" },
  { href: "/admin/parametres/salles", label: "Salles" },
  { href: "/admin/parametres/creneaux-recurrents", label: "Emplois du temps" },
  { href: "/admin/parametres/presences", label: "Lieux & niveaux" },
];

export function HeaderNav({
  role,
  deconnexion,
}: {
  role: "PROF" | "ADMIN";
  deconnexion: () => Promise<void>;
}) {
  const [ouvert, setOuvert] = useState(false);
  const liens = role === "ADMIN" ? [...LIENS_BASE, ...LIENS_ADMIN] : LIENS_BASE;

  const boutonDeconnexion = (className: string) => (
    <form action={deconnexion}>
      <button type="submit" className={className}>
        Déconnexion
      </button>
    </form>
  );

  return (
    <>
      {/* Desktop : nav horizontale complète */}
      <nav className="hidden flex-wrap items-center gap-x-4 gap-y-1 text-sm sm:flex">
        {liens.map((lien, i) => (
          <span key={lien.href} className="flex items-center gap-x-4">
            {role === "ADMIN" && i === LIENS_BASE.length && (
              <span className="text-white/30">·</span>
            )}
            <Link href={lien.href} className="hover:text-brand-accent">
              {lien.label}
            </Link>
          </span>
        ))}
        {boutonDeconnexion("rounded-md bg-white/10 px-3 py-1.5 transition hover:bg-white/20")}
      </nav>

      {/* Mobile : bouton hamburger + panneau déroulant */}
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-label="Menu"
        aria-expanded={ouvert}
        className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10 sm:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {ouvert ? (
            <path d="M6 6 18 18M6 18 18 6" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {ouvert && (
        <div className="absolute inset-x-0 top-full z-10 flex flex-col gap-1 bg-brand-slate px-4 pb-4 text-sm shadow-lg sm:hidden">
          {liens.map((lien, i) => (
            <div key={lien.href}>
              {role === "ADMIN" && i === LIENS_BASE.length && (
                <div className="my-1 border-t border-white/10" />
              )}
              <Link
                href={lien.href}
                onClick={() => setOuvert(false)}
                className="block rounded-md px-2 py-2 hover:bg-white/10"
              >
                {lien.label}
              </Link>
            </div>
          ))}
          <div className="mt-2">
            {boutonDeconnexion(
              "w-full rounded-md bg-white/10 px-3 py-2 text-left transition hover:bg-white/20"
            )}
          </div>
        </div>
      )}
    </>
  );
}
