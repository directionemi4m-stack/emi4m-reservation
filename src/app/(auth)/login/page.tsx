import Image from "next/image";
import { LoginForm } from "@/components/auth/LoginForm";

function messageErreur(code?: string): string | null {
  if (!code) return null;
  if (code === "Verification") {
    return "Ce lien de connexion n'est plus valide : il a déjà été utilisé ou a expiré. Redemandez-en un ci-dessous.";
  }
  return "La connexion a échoué. Redemandez un lien ci-dessous.";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Image
            src="/logo-emi4m.png"
            alt="EMI4M — École Musicale Itinérante des 4 Montagnes"
            width={72}
            height={72}
            className="rounded-full"
          />
          <h1 className="text-lg font-semibold text-brand-slate">Réservation des salles EMI4M</h1>
          <p className="text-sm text-slate-500">
            Connectez-vous avec votre adresse email professionnelle.
          </p>
        </div>
        <LoginForm erreurInitiale={messageErreur(params.error)} />
      </div>
    </main>
  );
}
