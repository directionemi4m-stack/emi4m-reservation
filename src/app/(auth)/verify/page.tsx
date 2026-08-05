export default function VerifyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-brand-slate">Vérifiez votre boîte mail</h1>
        <p className="mt-3 text-sm text-slate-500">
          Si l&apos;adresse saisie correspond à un compte EMI4M actif, un lien de connexion vient
          de vous être envoyé. Il est valable 15 minutes et à usage unique.
        </p>
      </div>
    </main>
  );
}
