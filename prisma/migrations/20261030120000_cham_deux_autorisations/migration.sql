-- CreateEnum
CREATE TYPE "AutorisationIntercours" AS ENUM ('A_RENSEIGNER', 'AUTORISE', 'NON_AUTORISE');

-- AlterTable (étape 1 : ajouts seulement ; l'ancienne colonne autorisationSortie est retirée
-- dans une migration suivante, une fois le nouveau code déployé)
ALTER TABLE "EleveCham" ADD COLUMN     "autorisationIntercours" "AutorisationIntercours" NOT NULL DEFAULT 'A_RENSEIGNER',
ADD COLUMN     "autorisationSortie16h30" "AutorisationSortie" NOT NULL DEFAULT 'A_RENSEIGNER',
ADD COLUMN     "documentDriveId" TEXT,
ADD COLUMN     "documentMajLe" TIMESTAMP(3),
ADD COLUMN     "documentNom" TEXT,
ADD COLUMN     "documentUrl" TEXT;
