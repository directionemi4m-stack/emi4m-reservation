
-- AlterTable
ALTER TABLE "EvenementSaison" ADD COLUMN     "sacemDepensesCentimes" INTEGER,
ADD COLUMN     "sacemDriveFileId" TEXT,
ADD COLUMN     "sacemEntreePayante" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sacemEntrees" INTEGER,
ADD COLUMN     "sacemEnvoyeeLe" TIMESTAMP(3),
ADD COLUMN     "sacemJauge" INTEGER,
ADD COLUMN     "sacemRecettesAnnexesCentimes" INTEGER,
ADD COLUMN     "sacemRecettesCentimes" INTEGER,
ADD COLUMN     "sacemTarifs" TEXT,
ADD COLUMN     "sacemUrl" TEXT;
