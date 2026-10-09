-- CreateEnum
CREATE TYPE "TypeCreneauAgenda" AS ENUM ('INDIVIDUEL', 'COLLECTIF');

-- CreateTable
CREATE TABLE "CreneauAgenda" (
    "id" TEXT NOT NULL,
    "profId" TEXT NOT NULL,
    "jourSemaine" "JourSemaine" NOT NULL,
    "heureDebutMinutes" INTEGER NOT NULL,
    "dureeMinutes" INTEGER NOT NULL,
    "type" "TypeCreneauAgenda" NOT NULL,
    "nom" TEXT NOT NULL,
    "uneSemaineSurDeux" BOOLEAN NOT NULL DEFAULT false,
    "lieuId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreneauAgenda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreneauAgenda_profId_jourSemaine_idx" ON "CreneauAgenda"("profId", "jourSemaine");

-- AddForeignKey
ALTER TABLE "CreneauAgenda" ADD CONSTRAINT "CreneauAgenda_profId_fkey" FOREIGN KEY ("profId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreneauAgenda" ADD CONSTRAINT "CreneauAgenda_lieuId_fkey" FOREIGN KEY ("lieuId") REFERENCES "LieuPresence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

