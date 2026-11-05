import { db } from "@/lib/db";
import { appelAFaire, appelEnRetard, bornesAppels, libelleSeance } from "@/lib/appels";
import { envoyerMailRappelAppels } from "@/lib/mail";
import { envoyerPush } from "@/lib/push";
import { noterEchecMail } from "@/lib/echecsMail";

export function aujourdHuiUTC(maintenant = new Date()) {
  return new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate()));
}

// Les séances des 3 dernières semaines sans appel ni absence du prof (d'un prof, ou de tous).
export async function seancesSansAppel(aujourdHui: Date, profId?: string) {
  const seances = await db.seance.findMany({
    where: {
      date: bornesAppels(aujourdHui),
      pointage: { is: null },
      absenceProf: { is: null },
      classe: { actif: true, ...(profId ? { profId } : { prof: { actif: true } }) },
    },
    select: {
      id: true,
      date: true,
      rappelAppelLe: true,
      classe: { select: { id: true, nom: true, emoji: true, dateDebut: true, prof: { select: { id: true, prenom: true, nom: true, email: true } } } },
    },
    orderBy: { date: "asc" },
  });
  // Une séance d'avant le début du cours ne compte pas (cours créé en cours d'année).
  return seances
    .filter((s) => s.date >= s.classe.dateDebut && appelAFaire({ date: s.date, aUnAppel: false }, aujourdHui))
    .map((s) => ({ ...s, enRetard: appelEnRetard({ date: s.date, aUnAppel: false }, aujourdHui) }));
}

// Chaque matin : un rappel par prof (notification + mail) pour ses séances passées depuis
// 3 jours sans appel. Une séance n'est rappelée qu'une fois.
export async function envoyerRappelsAppels(urlBase: string, maintenant = new Date()) {
  const aRappeler = (await seancesSansAppel(aujourdHuiUTC(maintenant))).filter((s) => s.enRetard && !s.rappelAppelLe);
  const parProf = new Map<string, typeof aRappeler>();
  for (const s of aRappeler) parProf.set(s.classe.prof.id, [...(parProf.get(s.classe.prof.id) ?? []), s]);

  const envois: { prof: string; seances: number }[] = [];
  for (const seances of parProf.values()) {
    // Réservation avant l'envoi : deux passages simultanés ne rappellent pas deux fois.
    const { count } = await db.seance.updateMany({
      where: { id: { in: seances.map((s) => s.id) }, rappelAppelLe: null },
      data: { rappelAppelLe: maintenant },
    });
    if (count === 0) continue;
    const prof = seances[0].classe.prof;
    const libelles = seances.map((s) => libelleSeance(s.classe.nom, s.date));
    const url = seances.length === 1 ? `${urlBase}/presences/${seances[0].classe.id}/${seances[0].id}` : `${urlBase}/presences`;
    await envoyerPush([prof.id], {
      titre: seances.length > 1 ? `${seances.length} appels à faire` : "Appel à faire",
      corps: seances.length > 1 ? libelles.join(" · ") : `${libelles[0]} : pense à faire l'appel.`,
      url: url.slice(urlBase.length),
    });
    try {
      await envoyerMailRappelAppels({ prof, seances: libelles, url });
    } catch (erreur) {
      await noterEchecMail(
        { destinataire: `${prof.prenom} ${prof.nom}`, objet: "Rappel d'appel à faire", detail: libelles.join(" ; ") },
        erreur
      );
    }
    envois.push({ prof: `${prof.prenom} ${prof.nom}`, seances: seances.length });
  }
  return { envois };
}
