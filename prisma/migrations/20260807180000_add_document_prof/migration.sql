
-- CreateEnum
CREATE TYPE "TypeDocument" AS ENUM ('PERMIS_CONDUIRE', 'CARTE_IDENTITE');

-- CreateTable
CREATE TABLE "DocumentProf" (
    "id" TEXT NOT NULL,
    "profId" TEXT NOT NULL,
    "type" "TypeDocument" NOT NULL,
    "nomFichier" TEXT NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "driveUrl" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentProf_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentProf_profId_type_key" ON "DocumentProf"("profId", "type");

-- AddForeignKey
ALTER TABLE "DocumentProf" ADD CONSTRAINT "DocumentProf_profId_fkey" FOREIGN KEY ("profId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

