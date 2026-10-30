-- CreateEnum
CREATE TYPE "CautionLocation" AS ENUM ('RECUE', 'MANQUANTE', 'RENDUE');

-- AlterTable
ALTER TABLE "LocationInstrument" ADD COLUMN     "caution" "CautionLocation";


-- Pré-remplissage à partir des commentaires saisis jusqu'ici (« Caution OK », « Manque la caution »).
UPDATE "LocationInstrument" SET "caution" = 'MANQUANTE' WHERE "commentaire" ILIKE '%manque%caution%';
UPDATE "LocationInstrument" SET "caution" = 'RECUE' WHERE "caution" IS NULL AND "commentaire" ILIKE '%caution ok%';
