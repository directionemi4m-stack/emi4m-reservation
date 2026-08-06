import Link from "next/link";
import { MotDePasseOublieForm } from "@/components/auth/MotDePasseOublieForm";

export default function MotDePasseOubliePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-brand-slate">Mot de passe oublié</h1>
          <p className="mt-2 text-sm text-slate-500">
            Indiquez votre adresse email, vous recevrez un lien pour définir un nouveau mot de passe.
          </p>
        </div>
        <MotDePasseOublieForm />
        <Link
          href="/login"
          className="mt-6 block text-center text-sm text-brand-accent hover:underline"
        >
          Retour à la connexion
        </Link>
      </div>
    </main>
  );
}
