import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité — EMI4M Réservation",
};

const CONTACT = "direction.emi4m@gmail.com";

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold text-brand-slate">{titre}</h2>
      {children}
    </section>
  );
}

function Liste({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function ConfidentialitePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <article className="mx-auto flex max-w-2xl flex-col gap-6 rounded-lg bg-white p-6 text-sm leading-relaxed text-slate-600 shadow-sm sm:p-10">
        <header className="flex flex-col items-center gap-3 text-center">
          <Image src="/logo-emi4m.png" alt="EMI4M" width={64} height={64} className="rounded-full" />
          <h1 className="text-xl font-semibold text-brand-slate">Politique de confidentialité</h1>
          <p className="text-xs text-slate-400">
            Application « EMI4M Réservation » — dernière mise à jour : 26 septembre 2026
          </p>
        </header>

        <Section titre="1. Qui est responsable de ces données ?">
          <p>
            L&apos;école EMI4M (École Musicale Itinérante des 4 Montagnes) met cette application à
            disposition de ses enseignants et de sa direction, pour un usage interne : réservation des
            salles, suivi des présences et remboursement des frais de déplacement. Elle n&apos;est pas
            ouverte au public. Contact : <a className="text-brand-accent hover:underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
          </p>
        </Section>

        <Section titre="2. Quelles données sont enregistrées ?">
          <Liste
            items={[
              "Comptes : nom, prénom, adresse e-mail et rôle de chaque enseignant. Le mot de passe est enregistré sous forme chiffrée (haché), jamais en clair.",
              "Réservations : salles, dates et horaires demandés, décisions de la direction.",
              "Présences : cours, noms des élèves saisis par l'enseignant, présences et absences, absences de l'enseignant.",
              "Frais de déplacement : dates, trajets, missions, kilomètres et montants.",
              "Fiche identité de l'enseignant (facultative, pour le remboursement des frais) : adresse, numéros de permis, de carte grise et d'assurance, véhicule utilisé.",
              "Pièces justificatives : copies du permis de conduire et de la carte d'identité, envoyées par l'enseignant (photo ou PDF).",
              "Élèves des classes à horaires aménagés (CHAM) : nom, prénom, âge, ville, téléphone et e-mail de contact, autorisation de quitter seul l'établissement, renseignés par la direction.",
            ]}
          />
        </Section>

        <Section titre="3. Pourquoi ?">
          <p>
            Uniquement pour faire fonctionner ces services et rembourser les frais engagés par les
            enseignants. Des e-mails de service sont envoyés (création de compte, réinitialisation de mot
            de passe, décision sur une réservation, alerte d&apos;absence d&apos;élève). Aucune donnée n&apos;est
            utilisée à des fins publicitaires ni vendue.
          </p>
        </Section>

        <Section titre="4. Utilisation de Google (Drive et Sheets)">
          <p>
            L&apos;application copie les présences et les frais dans un classeur Google Sheets de l&apos;école, et
            dépose les pièces justificatives dans un dossier Google Drive de l&apos;école (un sous-dossier par
            enseignant). Pour cela, elle est connectée à un seul compte Google, celui de la direction
            ({CONTACT}). Les enseignants ne connectent pas leur compte Google.
          </p>
          <p>
            L&apos;accès demandé à Google est limité aux fichiers créés par l&apos;application elle-même
            (autorisation « drive.file ») : elle ne lit, ne modifie et ne supprime aucun autre fichier de
            ce Drive. Les données obtenues via les API Google ne sont ni transférées à des tiers, ni
            utilisées pour de la publicité.
          </p>
          <p>
            L&apos;utilisation et le transfert par EMI4M Réservation des informations reçues des API Google
            respectent la{" "}
            <a
              className="text-brand-accent hover:underline"
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              politique relative aux données utilisateur des services d&apos;API Google
            </a>
            , y compris les exigences d&apos;utilisation limitée.
          </p>
        </Section>

        <Section titre="5. Qui y a accès ?">
          <Liste
            items={[
              "La direction de l'école, pour l'ensemble des données.",
              "Chaque enseignant, pour ses propres cours, trajets et documents, ainsi que la liste des élèves CHAM (en lecture seule).",
              "Nos prestataires techniques : Vercel (hébergement de l'application), Neon (base de données, région Francfort) et Google (Sheets, Drive et envoi des e-mails).",
            ]}
          />
        </Section>

        <Section titre="6. Sécurité et conservation">
          <p>
            Les échanges sont chiffrés (HTTPS), l&apos;accès demande une connexion par mot de passe et les
            fonctions d&apos;administration sont réservées à la direction. Les données sont conservées tant
            qu&apos;elles sont nécessaires à la gestion de l&apos;école, puis supprimées sur simple demande,
            sous réserve des obligations comptables légales.
          </p>
        </Section>

        <Section titre="7. Vos droits">
          <p>
            Vous pouvez demander l&apos;accès à vos données, leur rectification, leur suppression ou vous
            opposer à leur traitement en écrivant à{" "}
            <a className="text-brand-accent hover:underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>. Vous
            pouvez également adresser une réclamation à la CNIL (cnil.fr).
          </p>
        </Section>

        <footer className="border-t border-slate-100 pt-4 text-center text-xs">
          <Link href="/login" className="text-brand-accent hover:underline">
            Retour à l&apos;application
          </Link>
        </footer>
      </article>
    </main>
  );
}
