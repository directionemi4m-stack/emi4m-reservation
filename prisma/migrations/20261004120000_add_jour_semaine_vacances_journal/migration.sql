-- AlterTable
ALTER TABLE "Classe" ADD COLUMN     "jourSemaine" "JourSemaine";

-- CreateTable
CREATE TABLE "PeriodeVacances" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "debut" DATE NOT NULL,
    "fin" DATE NOT NULL,

    CONSTRAINT "PeriodeVacances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalImpersonation" (
    "id" TEXT NOT NULL,
    "directionId" TEXT NOT NULL,
    "cibleId" TEXT NOT NULL,
    "demarreLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "termineLe" TIMESTAMP(3),

    CONSTRAINT "JournalImpersonation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JournalImpersonation_directionId_termineLe_idx" ON "JournalImpersonation"("directionId", "termineLe");

-- AddForeignKey
ALTER TABLE "JournalImpersonation" ADD CONSTRAINT "JournalImpersonation_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalImpersonation" ADD CONSTRAINT "JournalImpersonation_cibleId_fkey" FOREIGN KEY ("cibleId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
