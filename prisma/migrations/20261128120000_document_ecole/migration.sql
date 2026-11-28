
-- CreateTable
CREATE TABLE "DocumentEcole" (
    "cle" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "pdf" BYTEA NOT NULL,
    "nomFichier" TEXT NOT NULL,
    "majLe" DATE NOT NULL,
    "deposeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentEcole_pkey" PRIMARY KEY ("cle")
);
