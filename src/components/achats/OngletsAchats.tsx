"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ONGLETS = [
  { href: "/admin/achats", libelle: "Factures d'achat" },
  { href: "/admin/achats/devis", libelle: "Devis fournisseurs" },
  { href: "/admin/achats/occasion", libelle: "Occasion" },
];

// Achats : ce que l'école paie (factures, devis des fournisseurs, achats d'occasion).
export function OngletsAchats() {
  const chemin = usePathname();
  const actif = (href: string) => (href === "/admin/achats" ? chemin === href : chemin.startsWith(href));
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Achats</h1>
        <p className="text-sm text-slate-500">Ce que l&apos;école paie. Pour ce qu&apos;elle facture à ses clients, voir « Facturation ».</p>
      </div>
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
