import Link from "next/link";

export default function VerifyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-accent/10">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-brand-accent"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-brand-slate">Vérifiez votre boîte mail</h1>
        <ol className="mt-4 flex flex-col gap-2 text-left text-sm text-slate-600">
          <li className="flex gap-2">
            <span className="font-semibold text-brand-accent">1.</span>
            Ouvrez le mail envoyé par EMI4M Réservation (pensez aux spams s&apos;il n&apos;apparaît
            pas).
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-brand-accent">2.</span>
            Cliquez sur le bouton <strong>« Se connecter »</strong> à l&apos;intérieur du mail.
          </li>
        </ol>
        <p className="mt-4 text-xs text-slate-400">
          Le lien est valable 30 minutes et à usage unique.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-brand-accent hover:underline"
        >
          Vous n&apos;avez rien reçu ? Redemander un lien
        </Link>
      </div>
    </main>
  );
}
