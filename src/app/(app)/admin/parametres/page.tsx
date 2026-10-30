import { PARAMETRES } from "@/lib/navigation";
import { GrilleTuiles, Tuile } from "@/components/navigation/Tuile";

export default function ParametresPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <h1 className="text-xl font-semibold text-brand-slate">Paramètres</h1>
      <GrilleTuiles>
        {PARAMETRES.map((lien) => (
          <Tuile key={lien.href} lien={lien} />
        ))}
      </GrilleTuiles>
    </div>
  );
}
