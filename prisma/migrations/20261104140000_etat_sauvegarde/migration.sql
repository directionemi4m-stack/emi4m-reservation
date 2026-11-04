-- CreateTable
CREATE TABLE "EtatSauvegarde" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "tenteeLe" TIMESTAMP(3) NOT NULL,
    "reussieLe" TIMESTAMP(3),
    "fichierUrl" TEXT,
    "taille" INTEGER,
    "nbLignes" INTEGER,
    "erreur" TEXT,

    CONSTRAINT "EtatSauvegarde_pkey" PRIMARY KEY ("id")
);

