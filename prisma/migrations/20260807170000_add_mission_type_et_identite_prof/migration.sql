
-- CreateEnum
CREATE TYPE "TypeMission" AS ENUM ('COURS', 'CONCERT', 'REUNION', 'AUTRE');

-- AlterTable
ALTER TABLE "Trajet" DROP COLUMN "mission",
ADD COLUMN     "precisionMission" TEXT,
ADD COLUMN     "typeMission" "TypeMission" NOT NULL;

-- CreateTable
CREATE TABLE "IdentiteProf" (
    "id" TEXT NOT NULL,
    "profId" TEXT NOT NULL,
    "adresseDomicile" TEXT,
    "numeroPermis" TEXT,
    "numeroCarteGrise" TEXT,
    "numeroAssuranceAuto" TEXT,
    "immatriculationVehicule" TEXT,
    "marqueModeleVehicule" TEXT,
    "puissanceFiscale" TEXT,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentiteProf_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdentiteProf_profId_key" ON "IdentiteProf"("profId");

-- AddForeignKey
ALTER TABLE "IdentiteProf" ADD CONSTRAINT "IdentiteProf_profId_fkey" FOREIGN KEY ("profId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

