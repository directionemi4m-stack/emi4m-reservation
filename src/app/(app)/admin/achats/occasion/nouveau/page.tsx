import Link from "next/link";
import { db } from "@/lib/db";
import { lireCoordonnees } from "@/lib/coordonneesServeur";
import { AttestationForm } from "@/components/achats/AttestationForm";

const aujourdHui = () => new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });

export default async function NouvelleAttestationPage() {
  const [coordonnees, lieux] = await Promise.all([lireCoordonnees(), db.lieuPresence.findMany({ where: { actif: true }, orderBy: { nom: "asc" } })]);
  // « Prénom Nom, directeur » → représentant et qualité ; commune de l'adresse pour « Fait à ».
  const [representant = "", qualite = ""] = (coordonnees.representant ?? "").split(/,\s*/);
  const commune = /\d{5}\s+(.+)$/m.exec(coordonnees.adresse)?.[1]?.trim() ?? "";
  const jour = aujourdHui();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/admin/achats/occasion" className="text-sm text-brand-accent hover:underline">
          ‹ Achats d&apos;occasion
        </Link>
        <h2 className="mt-1 text-lg font-semibold text-brand-slate">Nouvelle attestation de vente</h2>
      </div>
      <AttestationForm
        lieux={lieux.map((l) => l.nom)}
        valeurs={{
          date: jour,
          vendeurNom: "",
          vendeurAdresse: "",
          vendeurTelephone: "",
          vendeurEmail: "",
          vendeurPiece: "",
          representant,
          qualite,
          faitA: commune,
          modePaiement: "",
          referencePaiement: "",
          banque: "",
          datePaiement: jour,
          dateRemise: jour,
          demandePar: "",
          motif: "",
          destination: "",
          affectation: "",
          lignes: [],
        }}
      />
    </div>
  );
}
