
-- CreateEnum
CREATE TYPE "TypeAbsenceProf" AS ENUM ('RATTRAPAGE', 'ARRET_MALADIE');

-- CreateTable
CREATE TABLE "AbsenceProf" (
    "id" TEXT NOT NULL,
    "seanceId" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "profId" TEXT NOT NULL,
    "type" "TypeAbsenceProf" NOT NULL,
    "dateRattrapage" DATE,
    "commentaire" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbsenceProf_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AbsenceProf_seanceId_key" ON "AbsenceProf"("seanceId");

-- CreateIndex
CREATE INDEX "AbsenceProf_classeId_idx" ON "AbsenceProf"("classeId");

-- AddForeignKey
ALTER TABLE "AbsenceProf" ADD CONSTRAINT "AbsenceProf_seanceId_fkey" FOREIGN KEY ("seanceId") REFERENCES "Seance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceProf" ADD CONSTRAINT "AbsenceProf_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceProf" ADD CONSTRAINT "AbsenceProf_profId_fkey" FOREIGN KEY ("profId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

