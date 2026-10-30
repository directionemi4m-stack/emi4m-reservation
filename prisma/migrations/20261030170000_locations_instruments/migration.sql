-- CreateEnum
CREATE TYPE "ModePaiementLocation" AS ENUM ('CHEQUE', 'VIREMENT');

-- CreateTable
CREATE TABLE "LocationInstrument" (
    "id" TEXT NOT NULL,
    "anneeDebut" INTEGER NOT NULL,
    "instrument" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "anneeLocation" INTEGER NOT NULL,
    "nbMois" INTEGER,
    "paye" BOOLEAN NOT NULL DEFAULT false,
    "modePaiement" "ModePaiementLocation",
    "commentaire" TEXT,
    "dossierDriveId" TEXT,
    "dossierDriveUrl" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationInstrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentLocation" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "nomFichier" TEXT NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ajouteLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeLocation" (
    "id" TEXT NOT NULL,
    "anneeDebut" INTEGER NOT NULL,
    "instrument" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "commentaire" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandeLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LocationInstrument_anneeDebut_idx" ON "LocationInstrument"("anneeDebut");

-- CreateIndex
CREATE INDEX "LocationInstrument_nom_prenom_idx" ON "LocationInstrument"("nom", "prenom");

-- CreateIndex
CREATE INDEX "DocumentLocation_locationId_idx" ON "DocumentLocation"("locationId");

-- CreateIndex
CREATE INDEX "DemandeLocation_anneeDebut_idx" ON "DemandeLocation"("anneeDebut");

-- AddForeignKey
ALTER TABLE "DocumentLocation" ADD CONSTRAINT "DocumentLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "LocationInstrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

