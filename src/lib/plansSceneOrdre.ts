// Ordre des plans d'un concert : un passage d'élève suit l'ordre du programme (réglé par la
// direction), un plan libre garde le sien.
export function plansTries<T extends { ordre: number; creeLe: Date; inscription: { ordre: number } | null }>(plans: T[]): T[] {
  const cle = (p: T) => p.inscription?.ordre ?? p.ordre;
  return [...plans].sort((a, b) => cle(a) - cle(b) || a.creeLe.getTime() - b.creeLe.getTime());
}
