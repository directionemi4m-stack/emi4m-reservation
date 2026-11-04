-- AlterTable
ALTER TABLE "ConventionSalle" ADD COLUMN     "evenementSaisonId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ConventionSalle_evenementSaisonId_key" ON "ConventionSalle"("evenementSaisonId");

-- AddForeignKey
ALTER TABLE "ConventionSalle" ADD CONSTRAINT "ConventionSalle_evenementSaisonId_fkey" FOREIGN KEY ("evenementSaisonId") REFERENCES "EvenementSaison"("id") ON DELETE SET NULL ON UPDATE CASCADE;

