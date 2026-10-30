-- CreateEnum
CREATE TYPE "CategorieInventaire" AS ENUM ('MUSIQUE', 'BUREAU', 'LOGICIEL', 'AUTRE');

-- CreateEnum
CREATE TYPE "EtatMateriel" AS ENUM ('BON', 'A_REVISER', 'HORS_SERVICE', 'SORTI');

-- CreateTable
CREATE TABLE "ArticleInventaire" (
    "id" TEXT NOT NULL,
    "numeroImmo" INTEGER,
    "designation" TEXT NOT NULL,
    "categorie" "CategorieInventaire" NOT NULL DEFAULT 'MUSIQUE',
    "marqueModele" TEXT,
    "numeroSerie" TEXT,
    "dateAcquisition" DATE,
    "valeurCentimes" INTEGER,
    "lieuId" TEXT,
    "localisation" TEXT,
    "etat" "EtatMateriel" NOT NULL DEFAULT 'BON',
    "remarques" TEXT,
    "verifieLe" TIMESTAMP(3),
    "dossierDriveId" TEXT,
    "dossierDriveUrl" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleInventaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoInventaire" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "miniature" BYTEA NOT NULL,
    "ajouteLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoInventaire_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArticleInventaire_numeroImmo_key" ON "ArticleInventaire"("numeroImmo");

-- CreateIndex
CREATE INDEX "ArticleInventaire_categorie_idx" ON "ArticleInventaire"("categorie");

-- CreateIndex
CREATE INDEX "PhotoInventaire_articleId_idx" ON "PhotoInventaire"("articleId");

-- AddForeignKey
ALTER TABLE "ArticleInventaire" ADD CONSTRAINT "ArticleInventaire_lieuId_fkey" FOREIGN KEY ("lieuId") REFERENCES "LieuPresence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoInventaire" ADD CONSTRAINT "PhotoInventaire_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "ArticleInventaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

