-- AlterTable
ALTER TABLE "AppreciationCham" ADD COLUMN     "signataireNom" TEXT;

-- AlterTable
ALTER TABLE "BulletinCham" ADD COLUMN     "directionNom" TEXT;

-- AlterTable
ALTER TABLE "CoordonneesEcole" ADD COLUMN     "directionFonction" TEXT,
ADD COLUMN     "directionNom" TEXT;


-- Direction actuelle (modifiable dans Paramètres), et son nom sur les parties déjà signées
-- avec le compte partagé de la direction.
UPDATE "CoordonneesEcole" SET "directionNom" = 'Nicolas Bercovitz', "directionFonction" = 'direction';
UPDATE "AppreciationCham" a SET "signataireNom" = 'Nicolas Bercovitz - direction' FROM "User" u WHERE a."profId" = u."id" AND u."email" = 'direction.emi4m@gmail.com';
