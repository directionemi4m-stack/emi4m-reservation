import { IconPhone } from "@tabler/icons-react";

// Les numéros de la famille d'un élève, tirés de l'annuaire des élèves : un appel d'un clic.
// Quand l'élève a été retrouvé malgré une écriture différente (prénom seul, faute…), le nom
// de l'annuaire est rappelé pour que le prof vérifie que c'est bien la bonne famille.
export function TelephonesEleve({
  telephones,
  nomAnnuaire,
  compact = false,
}: {
  telephones: string[];
  nomAnnuaire?: string | null;
  compact?: boolean;
}) {
  if (telephones.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      {nomAnnuaire && <span className="text-xs font-normal text-slate-400">{nomAnnuaire} :</span>}
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
