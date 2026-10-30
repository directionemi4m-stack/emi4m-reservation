-- CreateEnum
CREATE TYPE "TypeEvenementSaison" AS ENUM ('HEURE_MUSICALE', 'CONCERT', 'AUDITION', 'EXAMEN', 'REUNION', 'AUTRE');

-- CreateTable
CREATE TABLE "EvenementSaison" (
    "id" TEXT NOT NULL,
    "type" "TypeEvenementSaison" NOT NULL,
    "titre" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "heureDebutMinutes" INTEGER,
    "lieuId" TEXT,
    "lieuPrecis" TEXT,
    "description" TEXT,
    "dureeMaxMinutes" INTEGER,
    "ongletSheetId" INTEGER,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvenementSaison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InscriptionHeureMusicale" (
    "id" TEXT NOT NULL,
    "evenementId" TEXT NOT NULL,
    "profId" TEXT NOT NULL,
    "eleveNom" TEXT NOT NULL,
    "instrument" TEXT NOT NULL,
    "programme" TEXT NOT NULL,
    "minutageSecondes" INTEGER NOT NULL,
    "materiel" TEXT,
    "commentaire" TEXT,
    "ordre" INTEGER NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InscriptionHeureMusicale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvenementSaison_date_idx" ON "EvenementSaison"("date");

-- CreateIndex
CREATE INDEX "InscriptionHeureMusicale_evenementId_ordre_idx" ON "InscriptionHeureMusicale"("evenementId", "ordre");

-- AddForeignKey
ALTER TABLE "EvenementSaison" ADD CONSTRAINT "EvenementSaison_lieuId_fkey" FOREIGN KEY ("lieuId") REFERENCES "LieuPresence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscriptionHeureMusicale" ADD CONSTRAINT "InscriptionHeureMusicale_evenementId_fkey" FOREIGN KEY ("evenementId") REFERENCES "EvenementSaison"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscriptionHeureMusicale" ADD CONSTRAINT "InscriptionHeureMusicale_profId_fkey" FOREIGN KEY ("profId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

