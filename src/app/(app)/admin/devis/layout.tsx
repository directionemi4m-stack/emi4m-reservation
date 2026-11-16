import { OngletsDevis } from "@/components/devis/OngletsDevis";

// Devis et factures (direction seulement, cf. admin/layout.tsx).
export default function DevisLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div className="print:hidden">
        <OngletsDevis />
      </div>
      {children}
    </div>
  );
}
