import { db } from "@/lib/db";
import { rapprocheurAnnuaire } from "@/lib/annuaireEleves";

// Rapproche tous les élèves des listes d'appel (cours actifs) de l'annuaire des élèves :
// sert au contrôle des listes (direction) et à la fiche de chaque élève.
export async function rapprochementListes() {
  const [annuaire, classes] = await Promise.all([
    db.eleveAnnuaire.findMany({ orderBy: [{ nom: "asc" }, { prenom: "asc" }] }),
    db.classe.findMany({
      where: { actif: true },
      select: {
        id: true,
        nom: true,
        emoji: true,
        type: true,
        prof: { select: { id: true, prenom: true, nom: true } },
        eleves: { where: { actif: true }, select: { id: true, nom: true }, orderBy: { nom: "asc" } },
      },
      orderBy: { nom: "asc" },
    }),
  ]);
  const retrouver = rapprocheurAnnuaire(annuaire);
  const inscriptions = classes.flatMap((classe) =>
    classe.eleves.map((eleve) => {
      const r = retrouver(eleve.nom, classe.nom);
      return { eleve, classe, fiche: r?.eleve ?? null, approche: r?.approche ?? false };
    })
  );
  return { annuaire, classes, inscriptions };
}
