-- CreateEnum
CREATE TYPE "TypeContratProf" AS ENUM ('CONTRAT', 'AVENANT');

-- AlterTable
ALTER TABLE "CoordonneesEcole" ADD COLUMN     "presidenceEmail" TEXT,
ADD COLUMN     "presidenceNom" TEXT,
ADD COLUMN     "presidenceQualite" TEXT;

-- CreateTable
CREATE TABLE "ContratProf" (
    "id" TEXT NOT NULL,
    "profId" TEXT NOT NULL,
    "anneeDebut" INTEGER NOT NULL,
    "type" "TypeContratProf" NOT NULL,
    "titre" TEXT NOT NULL,
    "pdf" BYTEA NOT NULL,
    "nomFichier" TEXT NOT NULL,
    "empreinte" TEXT NOT NULL,
    "papier" BOOLEAN NOT NULL DEFAULT false,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "envoyeLe" TIMESTAMP(3),
    "presidenceNom" TEXT,
    "presidenceQualite" TEXT,
    "presidenceEmail" TEXT,
    "presidenceParaphe" BYTEA,
    "presidenceSignature" BYTEA,
    "presidenceSigneLe" TIMESTAMP(3),
    "profParaphe" BYTEA,
    "profSignature" BYTEA,
    "profSigneLe" TIMESTAMP(3),
    "driveFileId" TEXT,
    "driveUrl" TEXT,
    "copieEnvoyeeLe" TIMESTAMP(3),

    CONSTRAINT "ContratProf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LienPresidence" (
    "id" TEXT NOT NULL,
    "jeton" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expire" TIMESTAMP(3) NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LienPresidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContratProf_profId_anneeDebut_idx" ON "ContratProf"("profId", "anneeDebut");

-- CreateIndex
CREATE INDEX "ContratProf_anneeDebut_idx" ON "ContratProf"("anneeDebut");

-- CreateIndex
CREATE UNIQUE INDEX "LienPresidence_jeton_key" ON "LienPresidence"("jeton");

-- AddForeignKey
ALTER TABLE "ContratProf" ADD CONSTRAINT "ContratProf_profId_fkey" FOREIGN KEY ("profId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

