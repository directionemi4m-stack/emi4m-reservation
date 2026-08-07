import { db } from "@/lib/db";

const MESSAGES_ERREUR: Record<string, string> = {
  "1": "Connexion annulée.",
  "2": "Google n'a pas renvoyé de jeton de rafraîchissement — révoquez l'accès de l'appli sur myaccount.google.com/permissions puis réessayez.",
  "3": "Échec de la connexion à Google. Réessayez.",
};

export default async function GoogleDrivePage({
  searchParams,
}: {
  searchParams: Promise<{ succes?: string; erreur?: string }>;
}) {
  const config = await db.configGoogle.findUnique({ where: { id: "singleton" } });
  const params = await searchParams;

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

      <p className="text-sm text-slate-700">
        {config ? (
          <>
            Connecté en tant que <strong>{config.compteEmail}</strong>.
          </>
        ) : (
          "Aucun compte connecté pour l'instant."
        )}
      </p>

      <a
        href="/api/admin/drive-oauth/start"
        className="inline-block w-fit rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90"
      >
        {config ? "Reconnecter" : "Connecter"} Google Drive
      </a>
    </div>
  );
}
