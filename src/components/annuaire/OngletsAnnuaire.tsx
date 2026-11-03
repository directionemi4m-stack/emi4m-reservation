import Link from "next/link";

// Les deux annuaires (élèves, collègues), sous un même titre.
export function OngletsAnnuaire({ actif }: { actif: "eleves" | "collegues" }) {
  const onglet = (cle: "eleves" | "collegues", href: string, libelle: string) => (
    <Link
      href={href}
      aria-current={actif === cle ? "page" : undefined}
      className={`flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition ${
        actif === cle ? "bg-white text-brand-slate shadow-sm" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {libelle}
    </Link>
  );
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold text-brand-slate">Annuaire</h1>
      <nav className="flex gap-1 rounded-lg bg-slate-200/70 p-1">
        {onglet("eleves", "/annuaire/eleves", "Élèves")}
        {onglet("collegues", "/annuaire", "Collègues")}
      </nav>
    </div>
  );
}
