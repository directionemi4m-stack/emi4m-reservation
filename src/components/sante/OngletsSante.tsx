"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ONGLETS = [
  { href: "/admin/sante", libelle: "Salariés et visites" },
  { href: "/admin/sante/factures", libelle: "Factures" },
  { href: "/admin/sante/organisme", libelle: "Service de santé" },
];

// Santé au travail : suivi des salariés, factures et coordonnées du service.
export function OngletsSante() {
  const chemin = usePathname();
  const actif = (href: string) => (href === "/admin/sante" ? chemin === href || chemin.startsWith("/admin/sante/salarie") : chemin.startsWith(href));
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Visites médicales</h1>
        <p className="text-sm text-slate-500">
          Le suivi de santé au travail des salariés : visites à prévoir, convocations, attestations, et les factures du service. Aucune
          information médicale n&apos;est gardée ici, seulement les dates et les avis remis à l&apos;employeur.
        </p>
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
