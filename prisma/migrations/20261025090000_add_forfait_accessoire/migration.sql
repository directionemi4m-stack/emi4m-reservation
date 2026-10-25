-- AlterTable
ALTER TABLE "ActiviteAccessoire" ADD COLUMN     "financementExceptionnel" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TypeEvenementAccessoire" ADD COLUMN     "toujoursPaye" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "HeuresHebdoContrat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "anneeScolaire" TEXT NOT NULL,
    "minutesHebdo" INTEGER NOT NULL,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeuresHebdoContrat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HeuresHebdoContrat_userId_anneeScolaire_key" ON "HeuresHebdoContrat"("userId", "anneeScolaire");

-- AddForeignKey
ALTER TABLE "HeuresHebdoContrat" ADD CONSTRAINT "HeuresHebdoContrat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Les remplacements sont toujours payés, hors forfait.
UPDATE "TypeEvenementAccessoire" SET "toujoursPaye" = true WHERE "nom" = 'Remplacement';
