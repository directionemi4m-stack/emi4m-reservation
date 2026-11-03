-- CreateTable
CREATE TABLE "EleveAnnuaire" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "instruments" TEXT[],
    "emails" TEXT[],
    "telephones" TEXT[],
    "commune" TEXT,

    CONSTRAINT "EleveAnnuaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportAnnuaireEleves" (
    "id" TEXT NOT NULL,
    "nomFichier" TEXT NOT NULL,
    "nbEleves" INTEGER NOT NULL,
    "importePar" TEXT NOT NULL,
    "correspondance" JSONB NOT NULL,
    "importeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportAnnuaireEleves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EleveAnnuaire_nom_prenom_idx" ON "EleveAnnuaire"("nom", "prenom");

