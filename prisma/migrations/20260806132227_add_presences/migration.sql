-- CreateEnum
CREATE TYPE "TypeCours" AS ENUM ('INSTRUMENT', 'FM');

-- CreateEnum
CREATE TYPE "StatutPresence" AS ENUM ('PRESENT', 'ABSENT', 'EXCUSE');

-- CreateTable
CREATE TABLE "LieuPresence" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LieuPresence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NiveauFM" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NiveauFM_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classe" (
    "id" TEXT NOT NULL,
    "profId" TEXT NOT NULL,
    "type" "TypeCours" NOT NULL,
    "nom" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "jour" TEXT,
    "lieuId" TEXT,
    "niveauFMId" TEXT,
    "dateDebut" DATE NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Classe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Eleve" (
    "id" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Eleve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seance" (
    "id" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "date" DATE NOT NULL,

    CONSTRAINT "Seance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pointage" (
    "id" TEXT NOT NULL,
    "seanceId" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "profId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pointage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresenceMarque" (
    "id" TEXT NOT NULL,
    "pointageId" TEXT NOT NULL,
    "eleveId" TEXT NOT NULL,
    "statut" "StatutPresence" NOT NULL DEFAULT 'PRESENT',

    CONSTRAINT "PresenceMarque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LieuPresence_nom_key" ON "LieuPresence"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "NiveauFM_nom_key" ON "NiveauFM"("nom");

-- CreateIndex
CREATE INDEX "Classe_profId_idx" ON "Classe"("profId");

-- CreateIndex
CREATE INDEX "Seance_classeId_date_idx" ON "Seance"("classeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Pointage_seanceId_key" ON "Pointage"("seanceId");

-- CreateIndex
CREATE INDEX "Pointage_classeId_idx" ON "Pointage"("classeId");

-- CreateIndex
CREATE UNIQUE INDEX "PresenceMarque_pointageId_eleveId_key" ON "PresenceMarque"("pointageId", "eleveId");

-- AddForeignKey
ALTER TABLE "Classe" ADD CONSTRAINT "Classe_profId_fkey" FOREIGN KEY ("profId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classe" ADD CONSTRAINT "Classe_lieuId_fkey" FOREIGN KEY ("lieuId") REFERENCES "LieuPresence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classe" ADD CONSTRAINT "Classe_niveauFMId_fkey" FOREIGN KEY ("niveauFMId") REFERENCES "NiveauFM"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Eleve" ADD CONSTRAINT "Eleve_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seance" ADD CONSTRAINT "Seance_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pointage" ADD CONSTRAINT "Pointage_seanceId_fkey" FOREIGN KEY ("seanceId") REFERENCES "Seance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pointage" ADD CONSTRAINT "Pointage_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pointage" ADD CONSTRAINT "Pointage_profId_fkey" FOREIGN KEY ("profId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresenceMarque" ADD CONSTRAINT "PresenceMarque_pointageId_fkey" FOREIGN KEY ("pointageId") REFERENCES "Pointage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresenceMarque" ADD CONSTRAINT "PresenceMarque_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve"("id") ON DELETE CASCADE ON UPDATE CASCADE;
