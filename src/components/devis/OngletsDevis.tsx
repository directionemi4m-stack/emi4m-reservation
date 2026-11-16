"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ONGLETS = [
  { href: "/admin/devis", libelle: "Devis émis" },
  { href: "/admin/devis/factures", libelle: "Factures" },
  { href: "/admin/devis/recus", libelle: "Devis reçus" },
  { href: "/admin/devis/rubriques", libelle: "Prestations" },
];

export function OngletsDevis() {
  const chemin = usePathname();
  const actif = (href: string) =>
    href === "/admin/devis" ? chemin === href || /^\/admin\/devis\/(nouveau|c[a-z0-9]{20,})/.test(chemin) : chemin.startsWith(href);
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold text-brand-slate">Devis et factures</h1>
      <nav className="flex gap-1 overflow-x-auto rounded-lg bg-slate-200/70 p-1">
        {ONGLETS.map((o) => (
          <Link
            key={o.href}
            href={o.href}
            aria-current={actif(o.href) ? "page" : undefined}
            className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-center text-sm font-medium ${
              actif(o.href) ? "bg-white text-brand-slate shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {o.libelle}
          </Link>
        ))}
      </nav>
    </div>
  );
}
