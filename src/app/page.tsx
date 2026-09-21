import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const FONCTIONS = [
  {
    titre: "Réservation des salles",
    texte: "Planning des salles des cinq communes, demandes de créneaux et validation par la direction.",
  },
  {
    titre: "Présences",
    texte: "Appel des élèves par cours, absences des enseignants et rattrapages.",
  },
  {
    titre: "Frais de déplacement",
    texte: "Déclaration des trajets et calcul automatique du remboursement.",
  },
];

// Page d'accueil publique (consultable sans connexion) : les utilisateurs connectés
// sont envoyés directement sur le planning.
export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/planning");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="flex w-full max-w-lg flex-col items-center gap-6 rounded-lg bg-white p-8 text-center shadow-sm">
        <Image src="/logo-emi4m.png" alt="EMI4M" width={80} height={80} className="rounded-full" />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-brand-slate">EMI4M Réservation</h1>
          <p className="text-sm text-slate-500">
            L&apos;application interne de l&apos;École Musicale Itinérante des 4 Montagnes, réservée à ses
            enseignants et à sa direction.
          </p>
        </div>

        <ul className="flex w-full flex-col gap-3 text-left">
          {FONCTIONS.map((f) => (
            <li key={f.titre} className="rounded-md bg-slate-50 p-3">
              <p className="text-sm font-semibold text-brand-slate">{f.titre}</p>
              <p className="text-xs text-slate-500">{f.texte}</p>
            </li>
          ))}
        </ul>

        <p className="text-xs text-slate-400">
          Les feuilles de présence, les frais et les pièces justificatives des enseignants sont archivés
          dans Google Sheets et Google Drive, sur le compte de la direction.
        </p>

        <Link
          href="/login"
          className="w-full rounded-md bg-brand-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-accent/90"
        >
          Se connecter
        </Link>

        <Link href="/confidentialite" className="text-xs text-brand-accent hover:underline">
          Politique de confidentialité
        </Link>
      </div>
    </main>
  );
}
