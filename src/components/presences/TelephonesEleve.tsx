import { IconPhone } from "@tabler/icons-react";

// Les numéros de la famille d'un élève, tirés de l'annuaire des élèves : un appel d'un clic.
export function TelephonesEleve({ telephones, compact = false }: { telephones: string[]; compact?: boolean }) {
  if (telephones.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap gap-x-2">
      {telephones.map((t) => (
        <a
          key={t}
          href={`tel:${t.replace(/[^\d+]/g, "")}`}
          className="inline-flex items-center gap-0.5 text-xs font-normal text-brand-accent hover:underline"
          title={`Appeler le ${t}`}
          aria-label={`Appeler le ${t}`}
        >
          <IconPhone size={14} aria-hidden />
          {!compact && t}
        </a>
      ))}
    </span>
  );
}
