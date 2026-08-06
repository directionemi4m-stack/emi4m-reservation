import type { StatutCreneau } from "@/generated/prisma/client";

const STYLES: Record<StatutCreneau, { label: string; className: string }> = {
  EN_ATTENTE: { label: "En attente", className: "bg-status-attente/15 text-status-attente" },
  VALIDEE: { label: "Validée", className: "bg-status-dispo/15 text-status-dispo" },
  REFUSEE: { label: "Refusée", className: "bg-status-occupee/15 text-status-occupee" },
  ANNULEE: { label: "Annulée", className: "bg-slate-200 text-slate-500" },
};

export function StatutBadge({ statut }: { statut: StatutCreneau }) {
  const { label, className } = STYLES[statut];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{label}</span>
  );
}
