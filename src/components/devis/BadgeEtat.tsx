const STYLES: Record<string, string> = {
  BROUILLON: "bg-slate-100 text-slate-600",
  ENVOYE: "bg-brand-accent/10 text-brand-accent",
  EXPIRE: "bg-status-attente/15 text-amber-800",
  ACCEPTE: "bg-status-dispo/15 text-emerald-800",
  REFUSE: "bg-status-occupee/10 text-status-occupee",
  EN_ATTENTE: "bg-brand-accent/10 text-brand-accent",
  SIGNE: "bg-status-dispo/15 text-emerald-800",
  ABANDONNE: "bg-slate-100 text-slate-500",
  FACTURE: "bg-emerald-100 text-emerald-900",
  PAYEE: "bg-status-dispo/15 text-emerald-800",
  A_PAYER: "bg-brand-accent/10 text-brand-accent",
  EN_RETARD: "bg-status-occupee/10 text-status-occupee",
};

export function BadgeEtat({ etat, libelle }: { etat: string; libelle: string }) {
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[etat] ?? STYLES.BROUILLON}`}>{libelle}</span>;
}
