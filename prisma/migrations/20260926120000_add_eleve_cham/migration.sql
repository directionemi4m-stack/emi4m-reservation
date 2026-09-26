
-- CreateEnum
CREATE TYPE "AutorisationSortie" AS ENUM ('A_RENSEIGNER', 'SEUL', 'ACCOMPAGNE');

-- CreateTable
CREATE TABLE "EleveCham" (
    "id" TEXT NOT NULL,
    "identifiantExterne" TEXT,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "age" INTEGER,
    "telephone" TEXT,
    "email" TEXT,
    "ville" TEXT,
    "autorisationSortie" "AutorisationSortie" NOT NULL DEFAULT 'A_RENSEIGNER',
    "precisionsSortie" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EleveCham_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EleveCham_identifiantExterne_key" ON "EleveCham"("identifiantExterne");

-- CreateIndex
CREATE INDEX "EleveCham_nom_prenom_idx" ON "EleveCham"("nom", "prenom");
