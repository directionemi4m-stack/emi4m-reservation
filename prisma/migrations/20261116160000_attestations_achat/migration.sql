-- CreateEnum
CREATE TYPE "ModePaiementAchat" AS ENUM ('VIREMENT', 'CHEQUE', 'ESPECES');

-- CreateEnum
CREATE TYPE "DestinationAchat" AS ENUM ('ECOLE', 'LOCATION');

-- CreateTable
CREATE TABLE "AttestationAchat" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "vendeurNom" TEXT NOT NULL,
    "vendeurAdresse" TEXT,
    "vendeurTelephone" TEXT,
    "vendeurEmail" TEXT,
    "vendeurPiece" TEXT,
    "representant" TEXT,
    "qualite" TEXT,
    "faitA" TEXT,
    "modePaiement" "ModePaiementAchat",
    "referencePaiement" TEXT,
    "banque" TEXT,
    "datePaiement" DATE,
    "dateRemise" DATE,
    "demandePar" TEXT,
    "motif" TEXT,
    "destination" "DestinationAchat",
    "affectation" TEXT,
    "pdfDriveFileId" TEXT,
    "pdfUrl" TEXT,
    "signeLe" TIMESTAMP(3),
    "signeDriveFileId" TEXT,
    "signeUrl" TEXT,
    "pieceDriveFileId" TEXT,
    "factureId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttestationAchat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneAttestationAchat" (
    "id" TEXT NOT NULL,
    "attestationId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "designation" TEXT NOT NULL,
    "marqueModele" TEXT,
    "numeroSerie" TEXT,
    "etat" TEXT,
    "prixCentimes" INTEGER NOT NULL,

    CONSTRAINT "LigneAttestationAchat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttestationAchat_numero_key" ON "AttestationAchat"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "AttestationAchat_factureId_key" ON "AttestationAchat"("factureId");

-- CreateIndex
CREATE INDEX "AttestationAchat_annee_idx" ON "AttestationAchat"("annee");

-- AddForeignKey
ALTER TABLE "AttestationAchat" ADD CONSTRAINT "AttestationAchat_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneAttestationAchat" ADD CONSTRAINT "LigneAttestationAchat_attestationId_fkey" FOREIGN KEY ("attestationId") REFERENCES "AttestationAchat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

