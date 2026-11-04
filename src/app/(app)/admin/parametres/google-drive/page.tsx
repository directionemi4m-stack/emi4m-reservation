import { verifierConnexionDrive, type EtatConnexionDrive } from "@/lib/drive";
import { db } from "@/lib/db";
import { BoutonSauvegarde } from "@/components/admin/BoutonSauvegarde";

const MESSAGES_ERREUR: Record<string, string> = {
  "1": "Connexion annulée.",
  "2": "Google n'a pas renvoyé de jeton de rafraîchissement — révoquez l'accès de l'appli sur myaccount.google.com/permissions puis réessayez.",
  "3": "Échec de la connexion à Google. Réessayez.",
};

const formaterDate = (d: Date) =>
  d.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });

function Etat({ etat }: { etat: EtatConnexionDrive }) {
  const pastille = (couleur: string, titre: string, detail?: React.ReactNode) => (
    <div className="flex flex-col gap-1 rounded-lg bg-white p-4 shadow-sm">
      <p className={`text-sm font-semibold ${couleur}`}>● {titre}</p>
      {detail && <p className="text-sm text-slate-600">{detail}</p>}
    </div>
  );

  switch (etat.statut) {
    case "non_configure":
      return pastille(
        "text-slate-500",
        "Non configuré",
        "Les variables GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET et GOOGLE_DRIVE_DOCUMENTS_FOLDER_ID ne sont pas toutes définies."
      );
    case "non_connecte":
      return pastille(
        "text-status-attente",
        "Aucun compte connecté",
        "Tant qu'aucun compte n'est connecté, les profs ne peuvent pas envoyer de documents."
      );
    case "expiree":
      return pastille(
        "text-status-occupee",
        "Connexion expirée",
        <>
          Le compte <strong>{etat.compteEmail}</strong> n&apos;est plus autorisé (dernière connexion :{" "}
          {formaterDate(etat.majLe)}). Cliquez sur « Reconnecter » : tant que ce n&apos;est pas fait, les
          profs ne peuvent pas envoyer de documents.
        </>
      );
    case "indisponible":
      return pastille(
        "text-slate-500",
        "Vérification impossible pour le moment",
        "Google n'a pas répondu. Rechargez la page dans quelques instants."
      );
    case "active":
      return etat.dossierAccessible
        ? pastille(
            "text-status-dispo",
            "Connexion active",
            <>
              Connecté en tant que <strong>{etat.compteEmail}</strong> (dernière connexion :{" "}
              {formaterDate(etat.majLe)}). Le dossier « Documents profs » est accessible.
            </>
          )
        : pastille(
            "text-status-occupee",
            "Connexion active, mais dossier introuvable",
            "Le compte est bien autorisé, mais le dossier « Documents profs » n'est plus accessible : il a peut-être été supprimé ou déplacé hors de l'appli."
          );
  }
}

export default async function GoogleDrivePage({
  searchParams,
}: {
  searchParams: Promise<{ succes?: string; erreur?: string }>;
}) {
  const [etat, params, sauvegarde] = await Promise.all([
    verifierConnexionDrive(),
    searchParams,
    db.etatSauvegarde.findUnique({ where: { id: "singleton" } }),
  ]);
  const connecte = etat.statut !== "non_connecte" && etat.statut !== "non_configure";

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <h1 className="text-xl font-semibold text-brand-slate">Connexion Google Drive</h1>
      <p className="text-sm text-slate-500">
        Les pièces justificatives (permis, carte d&apos;identité) envoyées par les profs sont
        déposées dans Google Drive au nom du compte connecté ici — un compte de service ne
        peut pas y déposer de fichiers, il faut donc un vrai compte Google.
      </p>

      {params.succes && <p className="text-sm text-status-dispo">Connexion réussie.</p>}
      {params.erreur && (
        <p className="text-sm text-status-occupee">
          {MESSAGES_ERREUR[params.erreur] ?? "Échec de la connexion."}
        </p>
      )}

      <Etat etat={etat} />

      <a
        href="/api/admin/drive-oauth/start"
        className="inline-block w-fit rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90"
      >
        {connecte ? "Reconnecter" : "Connecter"} Google Drive
      </a>

      <section className="mt-4 flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-brand-slate">Sauvegarde de l&apos;appli</h2>
        <p className="text-sm text-slate-500">
          Chaque dimanche à l&apos;aube, une copie complète de la base (réservations, présences, signatures, conventions,
          annuaire…) est déposée dans le Drive, dossier « Sauvegardes de l&apos;appli ». Les 12 dernières sont gardées.
        </p>
        <p className="text-sm text-slate-700">
          {sauvegarde?.reussieLe ? (
            <>
              Dernière sauvegarde réussie : <strong>{formaterDate(sauvegarde.reussieLe)}</strong>
              {sauvegarde.fichierUrl && (
                <>
                  {" "}
                  ·{" "}
                  <a href={sauvegarde.fichierUrl} target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">
                    voir le fichier
                  </a>
                </>
              )}
            </>
          ) : (
            "Aucune sauvegarde pour l'instant."
          )}
        </p>
        {sauvegarde?.erreur && (
          <p className="text-sm text-status-occupee">
            Dernier essai en échec ({formaterDate(sauvegarde.tenteeLe)}) : {sauvegarde.erreur}
          </p>
        )}
        <BoutonSauvegarde />
      </section>
    </div>
  );
}
