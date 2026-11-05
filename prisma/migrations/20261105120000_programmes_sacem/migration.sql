-- CreateTable
CREATE TABLE "MorceauProgramme" (
    "id" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "titre" TEXT NOT NULL,
    "compositeur" TEXT NOT NULL,
    "arrangeur" TEXT,
    "dureeSecondes" INTEGER NOT NULL,

    CONSTRAINT "MorceauProgramme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoordonneesEcole" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "nom" TEXT NOT NULL,
    "sigle" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "telephone" TEXT,
    "email" TEXT,
    "siteWeb" TEXT,
    "siret" TEXT,
    "numeroSacem" TEXT,
    "representant" TEXT,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoordonneesEcole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MorceauProgramme_inscriptionId_ordre_idx" ON "MorceauProgramme"("inscriptionId", "ordre");

-- AddForeignKey
ALTER TABLE "MorceauProgramme" ADD CONSTRAINT "MorceauProgramme_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "InscriptionHeureMusicale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

