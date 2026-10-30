import webpush from "web-push";
import { db } from "@/lib/db";

export interface MessagePush {
  titre: string;
  corps: string;
  url: string; // page ouverte quand on touche la notification
}

function configurer(): boolean {
  const publique = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privee = process.env.VAPID_PRIVATE_KEY;
  if (!publique || !privee) return false;
  webpush.setVapidDetails(`mailto:${process.env.EMAIL_DIRECTION || "direction.emi4m@gmail.com"}`, publique, privee);
  return true;
}

// Envoie une notification à tous les appareils abonnés de ces utilisateurs. Un abonnement
// que le navigateur déclare expiré (404/410) est supprimé. Renvoie le nombre d'appareils
// effectivement prévenus ; ne lève jamais d'erreur (le mail reste le canal sûr).
export async function envoyerPush(userIds: string[], message: MessagePush): Promise<number> {
  if (userIds.length === 0 || !configurer()) return 0;
  const abonnements = await db.abonnementPush.findMany({ where: { userId: { in: userIds } } });
  const charge = JSON.stringify({ title: message.titre, body: message.corps, url: message.url });

  let envoyes = 0;
  await Promise.all(
    abonnements.map(async (a) => {
      try {
        await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, charge, {
          TTL: 60 * 60 * 24,
        });
        envoyes++;
      } catch (erreur) {
        const code = (erreur as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await db.abonnementPush.deleteMany({ where: { id: a.id } });
        } else {
          console.error("Notification push impossible :", erreur);
        }
      }
    })
  );
  return envoyes;
}
