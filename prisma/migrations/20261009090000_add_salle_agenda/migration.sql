-- AlterTable
ALTER TABLE "CreneauAgenda" ADD COLUMN     "salleId" TEXT;

-- AddForeignKey
ALTER TABLE "CreneauAgenda" ADD CONSTRAINT "CreneauAgenda_salleId_fkey" FOREIGN KEY ("salleId") REFERENCES "Salle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

