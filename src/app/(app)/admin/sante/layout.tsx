import { OngletsSante } from "@/components/sante/OngletsSante";

// Santé au travail (direction seulement, cf. admin/layout.tsx).
export default function SanteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <OngletsSante />
      {children}
    </div>
  );
}
