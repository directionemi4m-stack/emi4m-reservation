"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface Lien {
  href: string;
  label: string;
}

interface Groupe {
  label: string;
  liens: Lien[];
}

function groupes(role: "PROF" | "ADMIN"): Groupe[] {
  return [
    {
      label: "Réservation",
      liens: [
        { href: "/planning", label: "Planning" },
        { href: "/demandes", label: "Mes demandes" },
        ...(role === "ADMIN"
          ? [
              { href: "/admin/demandes", label: "Demandes à traiter" },
              { href: "/admin/parametres/salles", label: "Salles" },
              { href: "/admin/parametres/creneaux-recurrents", label: "Emplois du temps" },
            ]
          : []),
      ],
    },
    {
      label: "Présences",
      liens: [
        { href: "/presences", label: "Présences" },
        ...(role === "ADMIN"
          ? [{ href: "/admin/parametres/presences", label: "Lieux & niveaux" }]
          : []),
      ],
    },
  ];
}

function GroupeDesktop({ groupe }: { groupe: Groupe }) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    function fermerSiExterieur(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener("click", fermerSiExterieur);
    return () => document.removeEventListener("click", fermerSiExterieur);
  }, [ouvert]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        className="flex items-center gap-1 hover:text-brand-accent"
      >
        {groupe.label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {ouvert && (
        <div className="absolute left-0 top-full z-10 mt-2 flex min-w-44 flex-col gap-0.5 rounded-md bg-brand-slate py-2 text-left shadow-lg ring-1 ring-white/10">
          {groupe.liens.map((lien) => (
            <Link
              key={lien.href}
              href={lien.href}
              onClick={() => setOuvert(false)}
              className="px-3 py-1.5 hover:bg-white/10"
            >
              {lien.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function HeaderNav({
  role,
  deconnexion,
}: {
  role: "PROF" | "ADMIN";
  deconnexion: () => Promise<void>;
}) {
  const [ouvert, setOuvert] = useState(false);
  const grps = groupes(role);

  const boutonDeconnexion = (className: string) => (
    <form action={deconnexion}>
      <button type="submit" className={className}>
        Déconnexion
      </button>
    </form>
  );

  return (
    <>
      {/* Desktop : un menu déroulant par domaine */}
      <nav className="hidden items-center gap-x-5 text-sm sm:flex">
        {grps.map((groupe) => (
          <GroupeDesktop key={groupe.label} groupe={groupe} />
        ))}
        {role === "ADMIN" && (
          <Link href="/admin/parametres/profs" className="hover:text-brand-accent">
            Profs
          </Link>
        )}
        {boutonDeconnexion("rounded-md bg-white/10 px-3 py-1.5 transition hover:bg-white/20")}
      </nav>

      {/* Mobile : bouton hamburger + panneau déroulant organisé par domaine */}
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
        <div className="absolute inset-x-0 top-full z-10 flex flex-col gap-3 bg-brand-slate px-4 pb-4 text-sm shadow-lg sm:hidden">
          {grps.map((groupe) => (
            <div key={groupe.label}>
              <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-white/40">
                {groupe.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {groupe.liens.map((lien) => (
                  <Link
                    key={lien.href}
                    href={lien.href}
                    onClick={() => setOuvert(false)}
                    className="block rounded-md px-2 py-2 hover:bg-white/10"
                  >
                    {lien.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          {role === "ADMIN" && (
            <div>
              <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-white/40">
                Administration
              </p>
              <Link
                href="/admin/parametres/profs"
                onClick={() => setOuvert(false)}
                className="block rounded-md px-2 py-2 hover:bg-white/10"
              >
                Profs
              </Link>
            </div>
          )}
          <div className="border-t border-white/10 pt-3">
            {boutonDeconnexion(
              "w-full rounded-md bg-white/10 px-3 py-2 text-left transition hover:bg-white/20"
            )}
          </div>
        </div>
      )}
    </>
  );
}
