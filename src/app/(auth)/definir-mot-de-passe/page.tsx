import Link from "next/link";
import { DefinirMotDePasseForm } from "@/components/auth/DefinirMotDePasseForm";
import { verifierTokenMotDePasse } from "@/lib/tokensMotDePasse";

export default async function DefinirMotDePassePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const compte = token ? await verifierTokenMotDePasse(token) : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-brand-slate">Définir votre mot de passe</h1>
        </div>
        {token && compte ? (
          <DefinirMotDePasseForm token={token} />
        ) : (
          <div className="flex flex-col gap-4 text-sm text-slate-600">
            <p>Ce lien n&apos;est plus valide : il a expiré ou a déjà été utilisé.</p>
            <Link
              href="/mot-de-passe-oublie"
              className="rounded-md bg-brand-accent px-4 py-2 text-center font-semibold text-white transition hover:bg-brand-accent/90"
            >
              Recevoir un nouveau lien
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
