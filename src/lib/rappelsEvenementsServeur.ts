import { db } from "@/lib/db";
import { envoyerPush } from "@/lib/push";
import { messageRappel, rappelsAEnvoyer } from "@/lib/rappelsEvenements";

// Rappel quotidien (cf. /api/cron/rappels-evenements) : une notification à la direction
// pour préparer le matériel 2 jours avant chaque événement de la saison, et pour aller
// chercher les clés la veille.
export async function envoyerRappelsEvenements(maintenant = new Date()) {
  const aujourdHui = maintenant.toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
  const debut = new Date(`${aujourdHui}T00:00:00.000Z`);
  const fin = new Date(debut.getTime() + 3 * 24 * 3600 * 1000);
  const evenements = await db.evenementSaison.findMany({
    where: { date: { gt: debut, lt: fin } },
    select: {
      id: true, titre: true, date: true, heureDebutMinutes: true, lieuPrecis: true,
      rappelMaterielPour: true, rappelClesPour: true, lieu: { select: { nom: true } },
    },
  });
  const rappels = rappelsAEnvoyer(evenements.map((e) => ({ ...e, lieuNom: e.lieu?.nom ?? null })), aujourdHui);
  if (rappels.length === 0) return { rappels: [] };

  const direction = await db.user.findMany({ where: { role: "ADMIN", actif: true }, select: { id: true } });
  const ids = direction.map((u) => u.id);
  const envoyes: string[] = [];
  for (const { evenement, genre } of rappels) {
    const appareils = await envoyerPush(ids, messageRappel(evenement, genre)).catch(() => 0);
    await db.evenementSaison.update({
      where: { id: evenement.id },
      data: genre === "materiel" ? { rappelMaterielPour: evenement.date } : { rappelClesPour: evenement.date },
    });
    envoyes.push(`${genre === "materiel" ? "Matériel" : "Clés"} : ${evenement.titre} (${appareils} appareil(s))`);
  }
  return { rappels: envoyes };
}
