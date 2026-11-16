-- CreateEnum
CREATE TYPE "TypeIdee" AS ENUM ('ECOLE', 'APPLI');

-- CreateEnum
CREATE TYPE "StatutIdee" AS ENUM ('NOUVELLE', 'A_L_ETUDE', 'RETENUE', 'REALISEE', 'NON_RETENUE');

-- CreateTable
CREATE TABLE "Idee" (
    "id" TEXT NOT NULL,
    "type" "TypeIdee" NOT NULL,
    "titre" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "auteurId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "StatutIdee" NOT NULL DEFAULT 'NOUVELLE',
    "reponse" TEXT,
    "reponduLe" TIMESTAMP(3),
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Idee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Idee_statut_idx" ON "Idee"("statut");

-- CreateIndex
CREATE INDEX "Idee_auteurId_idx" ON "Idee"("auteurId");

-- AddForeignKey
ALTER TABLE "Idee" ADD CONSTRAINT "Idee_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

