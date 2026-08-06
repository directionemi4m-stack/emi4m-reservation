import Link from "next/link";
import { DefinirMotDePasseForm } from "@/components/auth/DefinirMotDePasseForm";

export default async function DefinirMotDePassePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-brand-slate">Définir votre mot de passe</h1>
        </div>
        {token ? (
          <DefinirMotDePasseForm token={token} />
        ) : (
          <p className="text-sm text-red-600">
            Lien invalide.{" "}
            <Link href="/mot-de-passe-oublie" className="text-brand-accent hover:underline">
              Demandez-en un nouveau
            </Link>
            .
          </p>
        )}
      </div>
    </main>
  );
}
