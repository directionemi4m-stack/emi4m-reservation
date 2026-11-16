-- CreateEnum
CREATE TYPE "StatutDevisRecu" AS ENUM ('EN_ATTENTE', 'SIGNE', 'ABANDONNE');

-- CreateEnum
CREATE TYPE "StatutDevisEmis" AS ENUM ('BROUILLON', 'ENVOYE', 'ACCEPTE', 'REFUSE');

-- AlterTable
ALTER TABLE "CoordonneesEcole" ADD COLUMN     "bic" TEXT,
ADD COLUMN     "conditionsPaiement" TEXT,
ADD COLUMN     "iban" TEXT,
ADD COLUMN     "mentionTva" TEXT,
ADD COLUMN     "mentionsFacture" TEXT;

-- CreateTable
CREATE TABLE "DevisRecu" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "fournisseur" TEXT NOT NULL,
    "objet" TEXT,
    "montantCentimes" INTEGER,
    "valableJusquAu" DATE,
    "statut" "StatutDevisRecu" NOT NULL DEFAULT 'EN_ATTENTE',
    "motifAbandon" TEXT,
    "decideLe" TIMESTAMP(3),
    "nomFichier" TEXT NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "signeDriveFileId" TEXT,
    "signeUrl" TEXT,
    "factureId" TEXT,
    "ajouteLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevisRecu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevisEmis" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "dateDevis" DATE NOT NULL,
    "valableJusquAu" DATE NOT NULL,
    "clientNom" TEXT NOT NULL,
    "clientAdresse" TEXT,
    "clientEmail" TEXT,
    "objet" TEXT NOT NULL,
    "datePrestation" TEXT,
    "conditions" TEXT,
    "notes" TEXT,
    "statut" "StatutDevisEmis" NOT NULL DEFAULT 'BROUILLON',
    "envoyeLe" TIMESTAMP(3),
    "decideLe" TIMESTAMP(3),
    "motifRefus" TEXT,
    "pdfDriveFileId" TEXT,
    "pdfUrl" TEXT,
    "signeDriveFileId" TEXT,
    "signeUrl" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevisEmis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactureEmise" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "devisId" TEXT,
    "dateFacture" DATE NOT NULL,
    "echeance" DATE NOT NULL,
    "clientNom" TEXT NOT NULL,
    "clientAdresse" TEXT,
    "clientEmail" TEXT,
    "objet" TEXT NOT NULL,
    "datePrestation" TEXT,
    "conditions" TEXT,
    "payeeLe" DATE,
    "envoyeeLe" TIMESTAMP(3),
    "pdfDriveFileId" TEXT,
    "pdfUrl" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FactureEmise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneDocument" (
    "id" TEXT NOT NULL,
    "devisId" TEXT,
    "factureId" TEXT,
    "ordre" INTEGER NOT NULL,
    "designation" TEXT NOT NULL,
    "quantite" DOUBLE PRECISION NOT NULL,
    "unite" TEXT,
    "prixUnitaireCentimes" INTEGER NOT NULL,

    CONSTRAINT "LigneDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubriquePrestation" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "unite" TEXT,
    "prixUnitaireCentimes" INTEGER,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RubriquePrestation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DevisRecu_factureId_key" ON "DevisRecu"("factureId");

-- CreateIndex
CREATE INDEX "DevisRecu_statut_idx" ON "DevisRecu"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "DevisEmis_numero_key" ON "DevisEmis"("numero");

-- CreateIndex
CREATE INDEX "DevisEmis_annee_idx" ON "DevisEmis"("annee");

-- CreateIndex
CREATE UNIQUE INDEX "FactureEmise_numero_key" ON "FactureEmise"("numero");

-- CreateIndex
CREATE INDEX "FactureEmise_annee_idx" ON "FactureEmise"("annee");

-- CreateIndex
CREATE INDEX "LigneDocument_devisId_idx" ON "LigneDocument"("devisId");

-- CreateIndex
CREATE INDEX "LigneDocument_factureId_idx" ON "LigneDocument"("factureId");

-- AddForeignKey
ALTER TABLE "DevisRecu" ADD CONSTRAINT "DevisRecu_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactureEmise" ADD CONSTRAINT "FactureEmise_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "DevisEmis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneDocument" ADD CONSTRAINT "LigneDocument_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "DevisEmis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneDocument" ADD CONSTRAINT "LigneDocument_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "FactureEmise"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Rubriques de prestations proposées d'office (prix à compléter par la direction).
INSERT INTO "RubriquePrestation" ("id", "libelle", "description", "unite", "ordre") VALUES
  ('rubrique_scolaire', 'Intervention en milieu scolaire', 'Intervention musicale d''un professeur dans une classe', 'heure', 1),
  ('rubrique_creche', 'Intervention en crèche', 'Éveil musical des tout-petits', 'séance', 2),
  ('rubrique_ime', 'Intervention à l''IME', 'Atelier musical adapté', 'séance', 3),
  ('rubrique_concert', 'Concert', 'Prestation musicale des élèves et/ou des professeurs', 'forfait', 4),
  ('rubrique_location', 'Location', 'Location de matériel ou d''instrument', 'forfait', 5),
  ('rubrique_deplacement', 'Frais de déplacement', NULL, 'km', 6);
