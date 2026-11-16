import { OngletsAchats } from "@/components/achats/OngletsAchats";

// Achats (direction seulement, cf. admin/layout.tsx) : factures d'achat, devis des
// fournisseurs, achats d'occasion à des particuliers.
export default function AchatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <OngletsAchats />
      {children}
    </div>
  );
}
