"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ONGLETS = [
  { href: "/presences", label: "Mes cours" },
  { href: "/presences/historique", label: "Historique" },
  { href: "/presences/export", label: "Export" },
];

export function PresencesSousNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex gap-2 border-b border-slate-200">
      {ONGLETS.map((onglet) => {
        const actif = pathname === onglet.href;
        return (
          <Link
            key={onglet.href}
            href={onglet.href}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              actif
                ? "border-brand-accent text-brand-accent"
                : "border-transparent text-slate-500 hover:text-brand-slate"
            }`}
          >
            {onglet.label}
          </Link>
        );
      })}
    </div>
  );
}
