import type { TypeMission } from "@/generated/prisma/client";

export const LABELS_MISSION: Record<TypeMission, string> = {
  COURS: "Cours",
  CONCERT: "Concert",
  REUNION: "Réunion",
  AUTRE: "Autre",
};

export function libelleMission(typeMission: TypeMission, precisionMission: string | null) {
  const base = LABELS_MISSION[typeMission];
  return precisionMission ? `${base} — ${precisionMission}` : base;
}
